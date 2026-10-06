// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";

import { Deploy } from "../script/Deploy.s.sol";
import { HalyardVault } from "../src/HalyardVault.sol";

contract DeployForkTest is Test {
    uint256 internal constant RECENT_BLOCK = 126_040_133;

    function test_deployWiresEverything() public {
        vm.createSelectFork(vm.envString("BSC_ARCHIVE_RPC"), RECENT_BLOCK);
        Deploy script = new Deploy();
        address feeRecipient = makeAddr("feeRecipient");

        HalyardVault vault = script.deploy(feeRecipient);
        script.check(vault, feeRecipient);
    }

    function test_runRefusesOtherChains() public {
        vm.chainId(97);
        Deploy script = new Deploy();
        vm.expectRevert("Deploy: not BSC mainnet");
        script.run();
    }
}
