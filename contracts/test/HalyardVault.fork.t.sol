// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { HalyardVault } from "../src/HalyardVault.sol";
import { MarketClock } from "../src/MarketClock.sol";
import { IComptroller, IMoolah, IPancakeV3SwapRouter, IVToken } from "../src/interfaces/External.sol";

interface IVenusUser {
    function mint(uint256 amount) external returns (uint256);
    function borrow(uint256 amount) external returns (uint256);
    function enterMarkets(address[] calldata vTokens) external returns (uint256[] memory);
    function updateDelegate(address delegate, bool approved) external;
}

/// @notice Runs against real BSC mainnet state through an archive RPC (`BSC_ARCHIVE_RPC`).
contract HalyardVaultForkTest is Test {
    // Pinned blocks so Foundry's RPC cache is reused between runs.
    uint256 internal constant RECENT_BLOCK = 126_040_133; // Tue Oct 6 2026, market closed
    uint256 internal constant FRIDAY_PRECLOSE_BLOCK = 125_348_619; // Fri Oct 2 2026 19:30 UTC

    address internal constant COMPTROLLER = 0xfD36E2c2a6789Db23113685031d7F16329158384;
    address internal constant VUSDT = 0xfD5840Cd36d94D7229439859C0112a4185BC0255;
    address internal constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address internal constant MOOLAH = 0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C;
    address internal constant ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;

    address internal constant VTSLAB = 0x97421799419Eb782628e73e7220d8E0A207469a3;
    address internal constant VNVDAB = 0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371;
    address internal constant VSPCXB = 0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A;
    address internal constant TSLAB = 0x5b1910eAaD6450E50f816082Aa078C41F10C292f;

    /// Real Venus account, about 98% of its collateral in TSLAB, health about 1.39 on Oct 6.
    address internal constant REAL_BORROWER = 0xAA40CB43f78B97701d0E5981D83822ed77dD57E9;

    HalyardVault internal vault;
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal keeper = makeAddr("keeper");
    address internal alice = makeAddr("alice");

    function _fork(uint256 blockNumber) internal {
        vm.createSelectFork(vm.envString("BSC_ARCHIVE_RPC"), blockNumber);
        address[] memory markets = new address[](3);
        (markets[0], markets[1], markets[2]) = (VTSLAB, VNVDAB, VSPCXB);
        uint24[] memory fees = new uint24[](3);
        (fees[0], fees[1], fees[2]) = (2500, 2500, 2500);
        vault = new HalyardVault(
            IComptroller(COMPTROLLER),
            IVToken(VUSDT),
            IMoolah(MOOLAH),
            IPancakeV3SwapRouter(ROUTER),
            feeRecipient,
            markets,
            fees
        );
    }

    function _policy(uint16 minBps, uint16 targetBps, uint16 weekendBps)
        internal
        view
        returns (HalyardVault.Policy memory p)
    {
        address[] memory sellable = new address[](1);
        sellable[0] = VTSLAB;
        p = HalyardVault.Policy({
            minHealthBps: minBps,
            targetHealthBps: targetBps,
            weekendHealthBps: weekendBps,
            maxSlippageBps: 150,
            expiry: uint40(block.timestamp + 30 days),
            sellable: sellable
        });
    }

    /// Supplies `tslab` TSLAB for alice and borrows `usdtDebt` USDT from her own wallet.
    function _openPosition(uint256 tslab, uint256 usdtDebt) internal {
        deal(TSLAB, alice, tslab);
        vm.startPrank(alice);
        IERC20(TSLAB).approve(VTSLAB, tslab);
        assertEq(IVenusUser(VTSLAB).mint(tslab), 0, "mint");
        address[] memory enter = new address[](1);
        enter[0] = VTSLAB;
        IVenusUser(COMPTROLLER).enterMarkets(enter);
        assertEq(IVenusUser(VUSDT).borrow(usdtDebt), 0, "borrow");
        vm.stopPrank();
    }

    function _enable(address user, HalyardVault.Policy memory p) internal {
        vm.startPrank(user);
        IVenusUser(COMPTROLLER).updateDelegate(address(vault), true);
        vault.setPolicy(p);
        vm.stopPrank();
    }

    function _report(string memory label, address user, HalyardVault.Plan memory plan, uint256 healthBefore)
        internal
    {
        (uint256 healthAfter,,) = vault.health(user);
        emit log_string(label);
        emit log_named_decimal_uint("  health before", healthBefore, 4);
        emit log_named_decimal_uint("  health after ", healthAfter, 4);
        emit log_named_decimal_uint("  bStock sold  ", plan.seize, 18);
        emit log_named_decimal_uint("  USDT repaid  ", plan.repay, 18);
        emit log_named_decimal_uint("  protocol fee ", plan.fee, 18);
        emit log_named_decimal_uint("  keeper tip   ", plan.tip, 18);
    }

    function _assertNoDust() internal view {
        assertEq(IERC20(USDT).balanceOf(address(vault)), 0, "vault holds USDT");
        assertEq(IERC20(TSLAB).balanceOf(address(vault)), 0, "vault holds TSLAB");
    }

    // ------------------------------------------------------------------

    function test_lowHealthTriggerRestoresTarget() public {
        _fork(RECENT_BLOCK);
        assertFalse(MarketClock.inPreCloseWindow(block.timestamp));

        _openPosition(10e18, 2_200e18); // about $3.8k TSLAB, health about 1.21
        (uint256 healthBefore,,) = vault.health(alice);
        assertLt(healthBefore, 12_500);

        _enable(alice, _policy(12_500, 14_000, 16_000));
        HalyardVault.Plan memory plan = vault.canProtect(alice);
        assertEq(uint8(plan.trigger), uint8(HalyardVault.Trigger.LowHealth));
        assertEq(plan.vCollateral, VTSLAB);

        uint256 debtBefore = IVToken(VUSDT).borrowBalanceStored(alice);
        vm.prank(keeper);
        vault.protect(alice);
        _report("low health trigger", alice, plan, healthBefore);

        (uint256 healthAfter,,) = vault.health(alice);
        assertGe(healthAfter, 14_000, "below target");
        assertLe(healthAfter, 14_500, "oversold");
        assertLt(IVToken(VUSDT).borrowBalanceStored(alice), debtBefore - plan.repay + 1);
        assertEq(IERC20(USDT).balanceOf(keeper), plan.tip);
        assertEq(IERC20(USDT).balanceOf(feeRecipient), plan.fee);
        _assertNoDust();

        // Once restored, there is nothing left to do.
        vm.expectRevert(HalyardVault.NothingToProtect.selector);
        vault.protect(alice);
    }

    function test_preCloseTriggerOnRealFriday() public {
        _fork(FRIDAY_PRECLOSE_BLOCK);
        assertTrue(MarketClock.inPreCloseWindow(block.timestamp), "not in the Friday window");

        _openPosition(10e18, 1_700e18); // health about 1.5: fine midweek, too low for the weekend
        _enable(alice, _policy(12_000, 13_500, 18_000));

        HalyardVault.Plan memory plan = vault.canProtect(alice);
        assertEq(uint8(plan.trigger), uint8(HalyardVault.Trigger.PreClose));

        vm.prank(keeper);
        vault.protect(alice);
        _report("pre-close trigger, Fri Oct 2 19:30 UTC", alice, plan, plan.healthBps);

        (uint256 healthAfter,,) = vault.health(alice);
        assertGe(healthAfter, 18_000, "weekend target not reached");
        _assertNoDust();
    }

    function test_realBorrowerPosition() public {
        _fork(RECENT_BLOCK);
        (uint256 healthBefore,,) = vault.health(REAL_BORROWER);
        assertGt(healthBefore, 13_000);
        assertLt(healthBefore, 14_500);

        // The account owner opts in with a stricter policy than their current health.
        _enable(REAL_BORROWER, _policy(14_500, 16_000, 17_000));
        HalyardVault.Plan memory plan = vault.canProtect(REAL_BORROWER);
        vm.prank(keeper);
        vault.protect(REAL_BORROWER);
        _report("real borrower 0xAA40...57E9", REAL_BORROWER, plan, healthBefore);

        (uint256 healthAfter,,) = vault.health(REAL_BORROWER);
        assertGe(healthAfter, 16_000);
        assertLe(healthAfter, 16_500);
        _assertNoDust();
    }

    function test_healthyPositionIsLeftAlone() public {
        _fork(RECENT_BLOCK);
        _openPosition(10e18, 1_000e18); // health about 2.66
        _enable(alice, _policy(12_500, 14_000, 16_000));

        assertEq(uint8(vault.canProtect(alice).trigger), uint8(HalyardVault.Trigger.None));
        vm.expectRevert(HalyardVault.NothingToProtect.selector);
        vault.protect(alice);
    }

    function test_requiresDelegation() public {
        _fork(RECENT_BLOCK);
        _openPosition(10e18, 2_200e18);
        vm.prank(alice);
        vault.setPolicy(_policy(12_500, 14_000, 16_000));

        assertEq(uint8(vault.canProtect(alice).trigger), uint8(HalyardVault.Trigger.None));
        vm.expectRevert(HalyardVault.NothingToProtect.selector);
        vault.protect(alice);
    }

    function test_rejectsInvalidPolicies() public {
        _fork(RECENT_BLOCK);
        vm.startPrank(alice);

        vm.expectRevert(HalyardVault.InvalidPolicy.selector);
        vault.setPolicy(_policy(12_500, 12_000, 16_000)); // target below trigger

        vm.expectRevert(HalyardVault.InvalidPolicy.selector);
        vault.setPolicy(_policy(11_000, 12_500, 16_000)); // target below the 1.3 floor

        HalyardVault.Policy memory p = _policy(12_500, 14_000, 16_000);
        p.sellable[0] = VUSDT; // not a bStock market
        vm.expectRevert(HalyardVault.InvalidPolicy.selector);
        vault.setPolicy(p);

        p = _policy(12_500, 14_000, 16_000);
        p.maxSlippageBps = 1_000;
        vm.expectRevert(HalyardVault.InvalidPolicy.selector);
        vault.setPolicy(p);
        vm.stopPrank();
    }

    function test_rejectsForeignFlashLoanCallback() public {
        _fork(RECENT_BLOCK);
        vm.expectRevert(HalyardVault.UnexpectedCallback.selector);
        vault.onMoolahFlashLoan(1e18, "");

        vm.prank(MOOLAH);
        vm.expectRevert(HalyardVault.UnexpectedCallback.selector);
        vault.onMoolahFlashLoan(1e18, "");
    }

    function test_bytecodeHasNoBorrowSelectors() public {
        _fork(RECENT_BLOCK);
        bytes memory code = address(vault).code;
        assertFalse(_containsPush4(code, 0xc5ebeaec), "borrow(uint256)");
        assertFalse(_containsPush4(code, 0x856e5bb3), "borrowBehalf(address,uint256)");
    }

    function _containsPush4(bytes memory code, bytes4 selector) internal pure returns (bool) {
        for (uint256 i; i + 4 < code.length; ++i) {
            if (
                code[i] == 0x63 && code[i + 1] == selector[0] && code[i + 2] == selector[1]
                    && code[i + 3] == selector[2] && code[i + 4] == selector[3]
            ) return true;
        }
        return false;
    }
}
