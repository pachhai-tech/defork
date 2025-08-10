// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {StoryForkNFT} from "../src/StoryForkNFT.sol";
import {ForkRegistry, IStoryForkNFT} from "../src/ForkRegistry.sol";

contract Deploy is Script {
    function run() external {
        // Env
        uint256 key = vm.envUint("PRIVATE_KEY");
        address royaltyReceiver = vm.envAddress("ROYALTY_RECEIVER");
        uint96 defaultRoyaltyBps = uint96(
            vm.envOr("DEFAULT_ROYALTY_BPS", uint256(500))
        );

        // ── Deploy NFT (wait for receipt) ────────────────────────────────────────
        vm.startBroadcast(key);
        StoryForkNFT nft = new StoryForkNFT(royaltyReceiver, defaultRoyaltyBps);
        vm.stopBroadcast();

        console2.log("StoryForkNFT:", address(nft));
        console2.log("Default royalty (bps):", defaultRoyaltyBps);

        // ── Deploy Registry (wait for receipt) ──────────────────────────────────
        vm.startBroadcast(key);
        ForkRegistry reg = new ForkRegistry(IStoryForkNFT(address(nft)));
        vm.stopBroadcast();

        console2.log("ForkRegistry:", address(reg));
    }
}
