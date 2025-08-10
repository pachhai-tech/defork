// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal surface we need from the NFT for type-safety.
interface IStoryForkNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ForkRegistry {
    /// @dev Immutable reference to the NFT contract.
    IStoryForkNFT public immutable NFT;

    /// @notice child => parent
    mapping(uint256 => uint256) public parentOf;

    /// @notice parent => children list
    mapping(uint256 => uint256[]) private _childrenOf;

    event ForkRegistered(
        uint256 indexed parentTokenId,
        uint256 indexed childTokenId,
        address indexed caller
    );

    constructor(IStoryForkNFT _nft) {
        NFT = _nft;
    }

    /// @notice Register a fork relation. Caller must own the child token.
    function registerFork(
        uint256 parentTokenId,
        uint256 childTokenId
    ) external {
        require(NFT.ownerOf(childTokenId) == msg.sender, "not child owner");
        require(parentTokenId != 0, "parent=0");
        require(childTokenId != 0, "child=0");
        require(parentTokenId != childTokenId, "same token");
        require(parentOf[childTokenId] == 0, "already registered");

        parentOf[childTokenId] = parentTokenId;
        _childrenOf[parentTokenId].push(childTokenId);

        emit ForkRegistered(parentTokenId, childTokenId, msg.sender);
    }

    /// @notice Return all children for a given parent.
    function childrenOf(
        uint256 parentTokenId
    ) external view returns (uint256[] memory) {
        return _childrenOf[parentTokenId];
    }
}
