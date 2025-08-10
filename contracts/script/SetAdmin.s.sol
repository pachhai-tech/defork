// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {StoryForkNFT} from "../src/StoryForkNFT.sol";

contract SetAdmin is Script {
    function run() external {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address nftAddr = vm.envAddress("NFT_ADDRESS");
        address adminAddr = vm.envAddress("ADMIN_ADDRESS");
        // optional; default true
        bool allowed = vm.envOr("ADMIN_ALLOWED", true);

        vm.startBroadcast(key);
        StoryForkNFT(nftAddr).setAdmin(adminAddr, allowed);
        vm.stopBroadcast();

        console2.log("Set admin:", adminAddr);
        console2.log("Allowed:", allowed);
        console2.log("On contract:", nftAddr);
    }
}
