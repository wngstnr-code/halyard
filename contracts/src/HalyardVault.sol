// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { MarketClock } from "./MarketClock.sol";
import {
    IComptroller,
    IMoolah,
    IMoolahFlashLoanCallback,
    IPancakeV3SwapRouter,
    IResilientOracle,
    IVAIController,
    IVToken
} from "./interfaces/External.sol";

/// @title HalyardVault
/// @notice Lets Venus borrowers that post bStocks as collateral borrow closer to their limit.
///         When a user's health drops below their minimum, or the US market is about to close for
///         a weekend or holiday, anyone can call `protect` to de-risk the position in one atomic
///         transaction: flash loan USDT, repay debt on behalf of the user, redeem bStock collateral
///         on behalf of the user, sell it on PancakeSwap v3, and repay the flash loan.
/// @dev Immutable, no owner, no admin keys. Venus delegation also grants borrowing rights, so this
///      contract deliberately contains no call to `borrow` or `borrowBehalf`.
///      Health is LT-weighted collateral divided by debt, in basis points (10_000 = 1.0), priced
///      with the same spot oracle Venus uses for liquidations.
contract HalyardVault is ReentrancyGuard, IMoolahFlashLoanCallback {
    using SafeERC20 for IERC20;

    enum Trigger {
        None,
        LowHealth,
        PreClose
    }

    struct Policy {
        uint16 minHealthBps;
        uint16 targetHealthBps;
        uint16 weekendHealthBps;
        uint16 maxSlippageBps;
        uint40 expiry;
        address[] sellable;
    }

    struct Plan {
        Trigger trigger;
        address vCollateral;
        uint256 healthBps;
        uint256 targetBps;
        uint256 repay; // USDT
        uint256 seize; // raw underlying units
        uint256 minOut; // USDT
        uint256 fee; // USDT
        uint256 tip; // USDT
    }

    struct BStockMarket {
        address underlying;
        uint24 poolFee;
    }

    uint256 public constant BPS = 10_000;
    uint256 public constant FEE_BPS = 30;
    uint256 public constant TIP_BPS = 10;
    uint256 public constant MIN_SLIPPAGE_BPS = 50;
    uint256 public constant MAX_SLIPPAGE_BPS = 300;
    uint256 public constant MIN_TRIGGER_HEALTH_BPS = 10_100;
    uint256 public constant MIN_TARGET_HEALTH_BPS = 13_000;
    uint256 public constant MAX_HEALTH_BPS = 30_000;
    uint256 public constant MAX_SELLABLE = 3;
    uint256 public constant MIN_REPAY = 10e18;

    uint8 private constant USE_LIQUIDATION_THRESHOLD = 1;
    uint256 private constant WAD = 1e18;

    IComptroller public immutable comptroller;
    IVToken public immutable vUsdt;
    IERC20 public immutable usdt;
    IMoolah public immutable moolah;
    IPancakeV3SwapRouter public immutable router;
    address public immutable feeRecipient;

    mapping(address vToken => BStockMarket) public bStockMarkets;
    mapping(address user => Policy) private _policies;

    /// @dev Set only for the duration of a flash loan.
    Plan private _active;
    address private _activeUser;
    address private _activeKeeper;

    event PolicySet(address indexed user, Policy policy);
    event PolicyCleared(address indexed user);
    event Protected(
        address indexed user,
        Trigger indexed trigger,
        address indexed vCollateral,
        uint256 seized,
        uint256 repaid,
        uint256 healthBefore,
        uint256 healthAfter,
        uint256 fee,
        uint256 tip,
        address keeper
    );

    error InvalidPolicy();
    error NothingToProtect();
    error NotDelegated();
    error VenusError(uint256 code);
    error InsufficientProceeds(uint256 received, uint256 needed);
    error HealthNotImproved(uint256 before, uint256 afterwards);
    error UnexpectedCallback();

    constructor(
        IComptroller comptroller_,
        IVToken vUsdt_,
        IMoolah moolah_,
        IPancakeV3SwapRouter router_,
        address feeRecipient_,
        address[] memory bStockVTokens,
        uint24[] memory poolFees
    ) {
        if (bStockVTokens.length != poolFees.length || feeRecipient_ == address(0)) revert InvalidPolicy();
        comptroller = comptroller_;
        vUsdt = vUsdt_;
        usdt = IERC20(vUsdt_.underlying());
        moolah = moolah_;
        router = router_;
        feeRecipient = feeRecipient_;
        for (uint256 i; i < bStockVTokens.length; ++i) {
            bStockMarkets[bStockVTokens[i]] =
                BStockMarket({ underlying: IVToken(bStockVTokens[i]).underlying(), poolFee: poolFees[i] });
        }
    }

    // ------------------------------------------------------------------
    // Policy
    // ------------------------------------------------------------------

    function setPolicy(Policy calldata policy) external {
        _validate(policy);
        _policies[msg.sender] = policy;
        emit PolicySet(msg.sender, policy);
    }

    function clearPolicy() external {
        delete _policies[msg.sender];
        emit PolicyCleared(msg.sender);
    }

    function policyOf(address user) external view returns (Policy memory) {
        return _policies[user];
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @return healthBps LT-weighted collateral over debt in bps, max uint when there is no debt
    /// @return weighted LT-weighted collateral in USD (1e18)
    /// @return debt total debt in USD (1e18), including VAI
    function health(address user) public view returns (uint256 healthBps, uint256 weighted, uint256 debt) {
        (uint256 err, uint256 liquidity, uint256 shortfall) = comptroller.getAccountLiquidity(user);
        if (err != 0) revert VenusError(err);
        debt = _debtValue(user);
        if (debt == 0) return (type(uint256).max, liquidity, 0);
        weighted = debt + liquidity - shortfall;
        healthBps = weighted * BPS / debt;
    }

    /// @notice What a call to `protect(user)` would do right now. Keepers and the UI use this.
    function canProtect(address user) external view returns (Plan memory) {
        return _plan(user);
    }

    function marketState() external view returns (bool open, bool preCloseWindow) {
        return (MarketClock.isOpen(block.timestamp), MarketClock.inPreCloseWindow(block.timestamp));
    }

    // ------------------------------------------------------------------
    // Protection
    // ------------------------------------------------------------------

    /// @notice Permissionless. The contract decides the trigger, the collateral and the amounts,
    ///         so the caller cannot pick harmful parameters. The caller earns the keeper tip.
    function protect(address user) external nonReentrant returns (Plan memory plan) {
        plan = _plan(user);
        if (plan.trigger == Trigger.None) revert NothingToProtect();

        _active = plan;
        _activeUser = user;
        _activeKeeper = msg.sender;
        moolah.flashLoan(address(usdt), plan.repay, "");
        delete _active;
        delete _activeUser;
        delete _activeKeeper;

        (uint256 healthAfter,,) = health(user);
        if (healthAfter <= plan.healthBps) revert HealthNotImproved(plan.healthBps, healthAfter);

        emit Protected(
            user,
            plan.trigger,
            plan.vCollateral,
            plan.seize,
            plan.repay,
            plan.healthBps,
            healthAfter,
            plan.fee,
            plan.tip,
            msg.sender
        );
    }

    /// @dev Moolah sends `assets` USDT, calls this, then pulls `assets` back with transferFrom.
    function onMoolahFlashLoan(uint256 assets, bytes calldata) external {
        address user = _activeUser;
        if (msg.sender != address(moolah) || user == address(0)) revert UnexpectedCallback();
        Plan memory plan = _active;

        usdt.forceApprove(address(vUsdt), assets);
        uint256 code = vUsdt.repayBorrowBehalf(user, assets);
        if (code != 0) revert VenusError(code);

        code = IVToken(plan.vCollateral).redeemUnderlyingBehalf(user, plan.seize);
        if (code != 0) revert VenusError(code);

        BStockMarket memory market = bStockMarkets[plan.vCollateral];
        uint256 seized = IERC20(market.underlying).balanceOf(address(this));
        IERC20(market.underlying).forceApprove(address(router), seized);
        uint256 received = router.exactInputSingle(
            IPancakeV3SwapRouter.ExactInputSingleParams({
                tokenIn: market.underlying,
                tokenOut: address(usdt),
                fee: market.poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: seized,
                amountOutMinimum: plan.minOut,
                sqrtPriceLimitX96: 0
            })
        );

        uint256 needed = assets + plan.fee + plan.tip;
        if (received < needed) revert InsufficientProceeds(received, needed);

        usdt.safeTransfer(feeRecipient, plan.fee);
        usdt.safeTransfer(_activeKeeper, plan.tip);
        _settleLeftover(user, received - needed);

        usdt.forceApprove(address(moolah), assets);
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    function _plan(address user) internal view returns (Plan memory plan) {
        Policy storage policy = _policies[user];
        if (policy.sellable.length == 0 || policy.expiry < block.timestamp) return plan;
        if (!comptroller.approvedDelegates(user, address(this))) return plan;

        uint256 weighted;
        uint256 debt;
        (plan.healthBps, weighted, debt) = health(user);

        if (plan.healthBps < policy.minHealthBps) {
            plan.trigger = Trigger.LowHealth;
            plan.targetBps = policy.targetHealthBps;
        } else if (MarketClock.inPreCloseWindow(block.timestamp) && plan.healthBps < policy.weekendHealthBps) {
            plan.trigger = Trigger.PreClose;
            plan.targetBps = policy.weekendHealthBps;
        } else {
            return plan;
        }

        IResilientOracle oracle = IResilientOracle(comptroller.oracle());
        uint256 usdtPrice = oracle.getUnderlyingPrice(address(vUsdt));
        uint256 haircut = (policy.maxSlippageBps + FEE_BPS + TIP_BPS) * WAD / BPS;
        uint256 maxRepayUsd = vUsdt.borrowBalanceStored(user) * usdtPrice / WAD;

        (address vCollateral, uint256 repayUsd, uint256 sellUsd) =
            _chooseCollateral(user, policy.sellable, oracle, weighted, debt, plan.targetBps, haircut, maxRepayUsd);
        if (vCollateral == address(0)) return Plan(Trigger.None, address(0), plan.healthBps, 0, 0, 0, 0, 0, 0);

        plan.vCollateral = vCollateral;
        plan.repay = repayUsd * WAD / usdtPrice;
        if (plan.repay < MIN_REPAY) return Plan(Trigger.None, address(0), plan.healthBps, 0, 0, 0, 0, 0, 0);

        plan.seize = sellUsd * WAD / oracle.getUnderlyingPrice(vCollateral);
        plan.minOut = sellUsd * (BPS - policy.maxSlippageBps) / BPS * WAD / usdtPrice;
        plan.fee = sellUsd * FEE_BPS / BPS * WAD / usdtPrice;
        plan.tip = sellUsd * TIP_BPS / BPS * WAD / usdtPrice;
    }

    /// @dev Solves (W - l*k*x) / (D - x) = T for the repay amount x, where l is the market's
    ///      liquidation threshold and k = 1 / (1 - haircut) is how much collateral value must be sold
    ///      per unit of repaid debt. Picks the first sellable market that covers x in full, or else the
    ///      market that gets closest.
    function _chooseCollateral(
        address user,
        address[] storage sellable,
        IResilientOracle oracle,
        uint256 weighted,
        uint256 debt,
        uint256 targetBps,
        uint256 haircut,
        uint256 maxRepayUsd
    ) internal view returns (address best, uint256 bestRepay, uint256 bestSell) {
        uint256 target = targetBps * WAD / BPS;
        if (target * debt <= weighted * WAD) return (address(0), 0, 0);

        for (uint256 i; i < sellable.length; ++i) {
            address vToken = sellable[i];
            (uint256 err, uint256 vBalance,, uint256 exchangeRate) = IVToken(vToken).getAccountSnapshot(user);
            if (err != 0 || vBalance == 0) continue;

            uint256 available = vBalance * exchangeRate / WAD * oracle.getUnderlyingPrice(vToken) / WAD;
            uint256 lk = comptroller.getEffectiveLtvFactor(user, vToken, USE_LIQUIDATION_THRESHOLD) * WAD
                / (WAD - haircut);
            if (lk >= target) continue;

            uint256 repay = (target * debt - weighted * WAD) / (target - lk);
            if (repay > maxRepayUsd) repay = maxRepayUsd;
            uint256 sell = repay * WAD / (WAD - haircut);
            if (sell > available) {
                sell = available;
                repay = sell * (WAD - haircut) / WAD;
            }

            if (repay > bestRepay) {
                (best, bestRepay, bestSell) = (vToken, repay, sell);
            }
            if (sell < available) break; // this market covers the full amount
        }
    }

    function _debtValue(address user) internal view returns (uint256 debt) {
        IResilientOracle oracle = IResilientOracle(comptroller.oracle());
        address[] memory assets = comptroller.getAssetsIn(user);
        for (uint256 i; i < assets.length; ++i) {
            uint256 borrowed = IVToken(assets[i]).borrowBalanceStored(user);
            if (borrowed != 0) debt += borrowed * oracle.getUnderlyingPrice(assets[i]) / WAD;
        }
        address vai = comptroller.vaiController();
        if (vai != address(0)) debt += IVAIController(vai).getVAIRepayAmount(user);
    }

    /// @dev Extra proceeds repay more of the user's USDT debt; anything beyond the debt goes back
    ///      to the user.
    function _settleLeftover(address user, uint256 leftover) internal {
        if (leftover == 0) return;
        uint256 owed = vUsdt.borrowBalanceStored(user);
        uint256 repay = leftover < owed ? leftover : owed;
        if (repay != 0) {
            usdt.forceApprove(address(vUsdt), repay);
            uint256 code = vUsdt.repayBorrowBehalf(user, repay);
            if (code != 0) revert VenusError(code);
        }
        if (leftover > repay) usdt.safeTransfer(user, leftover - repay);
    }

    function _validate(Policy calldata policy) internal view {
        bool ok = policy.minHealthBps >= MIN_TRIGGER_HEALTH_BPS && policy.targetHealthBps > policy.minHealthBps
            && policy.targetHealthBps >= MIN_TARGET_HEALTH_BPS && policy.targetHealthBps <= MAX_HEALTH_BPS
            && policy.weekendHealthBps >= MIN_TARGET_HEALTH_BPS && policy.weekendHealthBps <= MAX_HEALTH_BPS
            && policy.maxSlippageBps >= MIN_SLIPPAGE_BPS && policy.maxSlippageBps <= MAX_SLIPPAGE_BPS
            && policy.expiry > block.timestamp && policy.sellable.length != 0
            && policy.sellable.length <= MAX_SELLABLE;
        if (!ok) revert InvalidPolicy();

        for (uint256 i; i < policy.sellable.length; ++i) {
            if (bStockMarkets[policy.sellable[i]].underlying == address(0)) revert InvalidPolicy();
            for (uint256 j; j < i; ++j) {
                if (policy.sellable[i] == policy.sellable[j]) revert InvalidPolicy();
            }
        }
    }
}
