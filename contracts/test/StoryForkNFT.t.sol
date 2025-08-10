// contracts/test/StoryForkNFT.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StoryForkNFT} from "../src/StoryForkNFT.sol";

contract StoryForkNFTTest is Test {
    StoryForkNFT private nft;

    address internal owner = address(this); // deployer / Ownable owner
    address internal author = address(0xA11CE);
    address internal admin = address(0xAD0001);
    address internal royaltyReceiver = address(0xBEEF);

    function setUp() public {
        // default royalty: 5% (500 bps)
        nft = new StoryForkNFT(royaltyReceiver, 500);
    }

    function testMintAndTotalSupply() public {
        vm.prank(author);
        uint256 id = nft.mint(
            author,
            "ipfs://cid/meta1.json",
            address(0), // use default royalty
            0, // use default royalty
            StoryForkNFT.ContentType.TEXT,
            StoryForkNFT.ContributionType.HUMAN,
            "" // modelId empty for human
        );

        assertEq(id, 1);
        assertEq(nft.totalSupply(), 1);
        assertEq(nft.ownerOf(1), author);
        assertEq(nft.tokenURI(1), "ipfs://cid/meta1.json");
    }

    function testSetContentHash() public {
        vm.startPrank(author);
        uint256 id = nft.mint(
            author,
            "ipfs://cid/meta2.json",
            address(0),
            0,
            StoryForkNFT.ContentType.TEXT,
            StoryForkNFT.ContributionType.HUMAN,
            ""
        );
        vm.stopPrank();

        bytes32 h = keccak256("hello-world");

        // author can set content hash
        vm.prank(author);
        nft.setContentHash(id, h);

        assertEq(nft.contentHashOf(id), h);
    }

    function testSetTokenURIByAuthor() public {
        vm.startPrank(author);
        uint256 id = nft.mint(
            author,
            "ipfs://cid/original.json",
            address(0),
            0,
            StoryForkNFT.ContentType.TEXT,
            StoryForkNFT.ContributionType.HUMAN,
            ""
        );
        nft.setTokenUri(id, "ipfs://cid/updated.json");
        vm.stopPrank();

        assertEq(nft.tokenURI(id), "ipfs://cid/updated.json");
    }

    function testSetTokenURIByAdmin() public {
        // mint as author
        vm.prank(author);
        uint256 id = nft.mint(
            author,
            "ipfs://cid/original.json",
            address(0),
            0,
            StoryForkNFT.ContentType.IMAGE,
            StoryForkNFT.ContributionType.AI,
            "llama-3-8b-q4"
        );

        // grant admin (only owner can call; owner is deployer i.e. this contract)
        nft.setAdmin(admin, true);

        // admin updates tokenURI
        vm.prank(admin);
        nft.setTokenUri(id, "ipfs://cid/admin-update.json");

        assertEq(nft.tokenURI(id), "ipfs://cid/admin-update.json");
    }
}
