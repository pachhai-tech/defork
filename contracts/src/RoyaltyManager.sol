// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {StoryForkNFT} from "./StoryForkNFT.sol";

contract RoyaltyManager is Ownable {
    StoryForkNFT public immutable NFT;

    constructor(address _nft) Ownable(msg.sender) {
        NFT = StoryForkNFT(_nft);
    }

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        NFT.setDefaultRoyalty(receiver, feeNumerator);
    }
}
