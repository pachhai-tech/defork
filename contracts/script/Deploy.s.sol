// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {StoryForkNFT} from "../src/StoryForkNFT.sol";
import {ForkRegistry, IStoryForkNFT} from "../src/ForkRegistry.sol";
import {RoyaltyManager} from "../src/RoyaltyManager.sol";
import {VotingPool} from "../src/VotingPool.sol";

contract Deploy is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address royaltyReceiver = vm.envAddress("ROYALTY_RECEIVER");
        uint96 defaultRoyaltyBps = uint96(vm.envUint("DEFAULT_ROYALTY_BPS"));

        // Get supported token addresses for voting
        address[] memory supportedTokens = new address[](2);
        supportedTokens[0] = vm.envAddress("USDC_ADDRESS");
        supportedTokens[1] = vm.envAddress("WETH_ADDRESS");

        console2.log("=== Hedera Deployment Starting ===");
        console2.log("Deployer:", vm.addr(deployerPrivateKey));
        console2.log("Royalty Receiver:", royaltyReceiver);
        console2.log("Default Royalty BPS:", defaultRoyaltyBps);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy contracts with detailed logging
        console2.log("\n[1/4] Deploying StoryForkNFT...");
        StoryForkNFT nft = new StoryForkNFT(royaltyReceiver, defaultRoyaltyBps);
        console2.log("StoryForkNFT:", address(nft));

        console2.log("\n[2/4] Deploying ForkRegistry...");
        ForkRegistry registry = new ForkRegistry(IStoryForkNFT(address(nft)));
        console2.log("ForkRegistry:", address(registry));

        console2.log("\n[3/4] Deploying RoyaltyManager...");
        RoyaltyManager royaltyManager = new RoyaltyManager(
            address(nft),
            address(registry),
            royaltyReceiver
        );
        console2.log("RoyaltyManager:", address(royaltyManager));

        console2.log("\n[4/4] Deploying VotingPool...");
        VotingPool votingPool = new VotingPool(
            address(nft),
            address(royaltyManager),
            supportedTokens
        );
        console2.log("VotingPool:", address(votingPool));

        console2.log("\n[5/5] Setting permissions...");
        nft.setAdmin(address(royaltyManager), true);
        console2.log("Permissions set");

        vm.stopBroadcast();

        // Final output
        console2.log("\n DEPLOYMENT SUCCESSFUL!");
        console2.log("\n Contract Addresses:");
        console2.log("NFT:            ", address(nft));
        console2.log("Registry:       ", address(registry));
        console2.log("RoyaltyManager: ", address(royaltyManager));
        console2.log("VotingPool:     ", address(votingPool));

        console2.log("\n Environment Variables:");
        console2.log("VITE_NFT_ADDRESS=", address(nft));
        console2.log("VITE_REGISTRY_ADDRESS=", address(registry));
        console2.log("VITE_ROYALTY_MANAGER_ADDRESS=", address(royaltyManager));
        console2.log("VITE_VOTING_POOL_ADDRESS=", address(votingPool));
    }
}
