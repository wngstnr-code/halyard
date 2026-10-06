// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script, console2 } from "forge-std/Script.sol";
import { VmSafe } from "forge-std/Vm.sol";

import { HalyardVault } from "../src/HalyardVault.sol";
import { IComptroller, IMoolah, IPancakeV3SwapRouter, IVToken } from "../src/interfaces/External.sol";

/// @notice Deploys HalyardVault to BSC mainnet with the addresses verified in docs/ARCHITECTURE.md.
/// @dev Usage (the deployer key lives in an encrypted Foundry keystore, never in .env):
///        FEE_RECIPIENT=0x... forge script script/Deploy.s.sol --rpc-url bsc \
///          --account halyard-deployer --sender 0x... --broadcast --verify --verifier sourcify
///      Without --broadcast the same command is a dry run against live state.
contract Deploy is Script {
    uint256 internal constant BSC_CHAIN_ID = 56;

    address internal constant COMPTROLLER = 0xfD36E2c2a6789Db23113685031d7F16329158384;
    address internal constant VUSDT = 0xfD5840Cd36d94D7229439859C0112a4185BC0255;
    address internal constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    address internal constant MOOLAH = 0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C;
    address internal constant ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;

    address internal constant VTSLAB = 0x97421799419Eb782628e73e7220d8E0A207469a3;
    address internal constant VNVDAB = 0xEb8Ca841cBe1BC4832A10b15c7dAB1081eDaD371;
    address internal constant VSPCXB = 0xC36dFaCc7a125859C106F29b9F2d874CCF29A55A;
    address internal constant TSLAB = 0x5b1910eAaD6450E50f816082Aa078C41F10C292f;
    address internal constant NVDAB = 0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436;
    address internal constant SPCXB = 0xbe9D156892E55e7154BcD3cB0FEA677F9D3103E1;

    uint24 internal constant POOL_FEE = 2500;

    string internal constant DEPLOYMENT_FILE = "deployments/56.json";

    function run() external returns (HalyardVault vault) {
        require(block.chainid == BSC_CHAIN_ID, "Deploy: not BSC mainnet");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast();
        vault = deploy(feeRecipient);
        vm.stopBroadcast();

        check(vault, feeRecipient);
        console2.log("HalyardVault", address(vault));
        console2.log("feeRecipient", feeRecipient);

        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) _record(vault, feeRecipient);
    }

    function deploy(address feeRecipient) public returns (HalyardVault) {
        address[] memory markets = new address[](3);
        (markets[0], markets[1], markets[2]) = (VTSLAB, VNVDAB, VSPCXB);
        uint24[] memory fees = new uint24[](3);
        (fees[0], fees[1], fees[2]) = (POOL_FEE, POOL_FEE, POOL_FEE);

        return new HalyardVault(
            IComptroller(COMPTROLLER),
            IVToken(VUSDT),
            IMoolah(MOOLAH),
            IPancakeV3SwapRouter(ROUTER),
            feeRecipient,
            markets,
            fees
        );
    }

    /// @notice Post-deploy wiring checks. Reverts if anything is off.
    function check(HalyardVault vault, address feeRecipient) public view {
        require(address(vault.comptroller()) == COMPTROLLER, "check: comptroller");
        require(address(vault.vUsdt()) == VUSDT, "check: vUSDT");
        require(address(vault.usdt()) == USDT, "check: USDT");
        require(address(vault.moolah()) == MOOLAH, "check: moolah");
        require(address(vault.router()) == ROUTER, "check: router");
        require(vault.feeRecipient() == feeRecipient, "check: fee recipient");
        _checkMarket(vault, VTSLAB, TSLAB);
        _checkMarket(vault, VNVDAB, NVDAB);
        _checkMarket(vault, VSPCXB, SPCXB);
    }

    function _checkMarket(HalyardVault vault, address vToken, address underlying) internal view {
        (address registered, uint24 fee) = vault.bStockMarkets(vToken);
        require(registered == underlying && fee == POOL_FEE, "check: bStock market");
    }

    function _record(HalyardVault vault, address feeRecipient) internal {
        string memory key = "deployment";
        vm.serializeUint(key, "chainId", block.chainid);
        // Lower bound for event scans: the block the script simulated against. The deploy
        // transaction lands at or after it.
        vm.serializeUint(key, "fromBlock", block.number);
        vm.serializeAddress(key, "feeRecipient", feeRecipient);
        string memory json = vm.serializeAddress(key, "halyardVault", address(vault));
        vm.writeJson(json, DEPLOYMENT_FILE);
    }
}
