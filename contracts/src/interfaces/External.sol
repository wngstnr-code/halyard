// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @dev Minimal slices of the external contracts HalyardVault talks to. Signatures were checked
///      against the deployed BSC mainnet contracts and their verified sources on 2026-10-06.

interface IVToken {
    function underlying() external view returns (address);

    function accrueInterest() external returns (uint256);

    function getAccountSnapshot(address account)
        external
        view
        returns (uint256 err, uint256 vTokenBalance, uint256 borrowBalance, uint256 exchangeRateMantissa);

    function borrowBalanceStored(address account) external view returns (uint256);

    /// @return 0 on success, a Venus error code otherwise
    function repayBorrowBehalf(address borrower, uint256 repayAmount) external returns (uint256);

    /// @dev Requires `comptroller.approvedDelegates(redeemer, msg.sender)`. The underlying is sent
    ///      to msg.sender. Returns 0 on success, a Venus error code otherwise.
    function redeemUnderlyingBehalf(address redeemer, uint256 redeemAmount) external returns (uint256);
}

interface IComptroller {
    /// @dev Uses liquidation threshold weights and the spot ResilientOracle.
    function getAccountLiquidity(address account)
        external
        view
        returns (uint256 err, uint256 liquidity, uint256 shortfall);

    function getAssetsIn(address account) external view returns (address[] memory);

    function oracle() external view returns (address);

    function vaiController() external view returns (address);

    function approvedDelegates(address user, address delegate) external view returns (bool);

    /// @param weightingStrategy 0 = collateral factor, 1 = liquidation threshold
    function getEffectiveLtvFactor(address account, address vToken, uint8 weightingStrategy)
        external
        view
        returns (uint256);
}

interface IVAIController {
    function getVAIRepayAmount(address account) external view returns (uint256);
}

interface IResilientOracle {
    /// @return price scaled by 1e(36 - underlying decimals)
    function getUnderlyingPrice(address vToken) external view returns (uint256);
}

interface IMoolah {
    function flashLoan(address token, uint256 assets, bytes calldata data) external;
}

interface IMoolahFlashLoanCallback {
    function onMoolahFlashLoan(uint256 assets, bytes calldata data) external;
}

/// @dev PancakeSwap v3 SwapRouter (the variant with a deadline field, selector 0x414bf389).
interface IPancakeV3SwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
