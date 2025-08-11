// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal surface we need from the NFT for type-safety.
interface IStoryForkNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
}

contract ForkRegistry {
    /// @dev Immutable reference to the NFT contract.
    IStoryForkNFT public immutable NFT;

    /// @notice child => parent
    mapping(uint256 => uint256) public parentOf;

    /// @notice parent => children list
    mapping(uint256 => uint256[]) private _childrenOf;

    /// @notice Fork costs (dynamic pricing)
    mapping(uint256 => uint256) public forkCost;
    uint256 public baseForkCost = 1e16; // 0.01 ETH equivalent
    uint256 public costMultiplier = 110; // 10% increase per fork level

    event ForkRegistered(
        uint256 indexed parentTokenId,
        uint256 indexed childTokenId,
        address indexed caller,
        uint256 cost
    );

    event ForkCostUpdated(uint256 indexed tokenId, uint256 newCost);

    constructor(IStoryForkNFT _nft) {
        NFT = _nft;
    }

    /// @notice Register a fork relation. Caller must own the child token.
    function registerFork(
        uint256 parentTokenId,
        uint256 childTokenId
    ) external payable {
        require(NFT.ownerOf(childTokenId) == msg.sender, "not child owner");
        require(parentOf[childTokenId] == 0, "child already has parent");

        // Calculate and require fork cost
        uint256 cost = calculateForkCost(parentTokenId);
        require(msg.value >= cost, "Insufficient payment");

        parentOf[childTokenId] = parentTokenId;
        _childrenOf[parentTokenId].push(childTokenId);

        // Update fork cost for this chain
        forkCost[childTokenId] = cost;

        // Refund excess payment
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit ForkRegistered(parentTokenId, childTokenId, msg.sender, cost);
    }

    function calculateForkCost(
        uint256 parentTokenId
    ) public view returns (uint256) {
        uint256 depth = getForkDepth(parentTokenId);
        uint256 cost = baseForkCost;

        // Exponential cost increase based on depth
        for (uint256 i = 0; i < depth; i++) {
            cost = (cost * costMultiplier) / 100;
        }

        return cost;
    }

    function getForkDepth(uint256 tokenId) public view returns (uint256) {
        uint256 depth = 0;
        uint256 current = tokenId;

        while (parentOf[current] != 0) {
            depth++;
            current = parentOf[current];
        }

        return depth;
    }

    function getChildren(
        uint256 parentTokenId
    ) external view returns (uint256[] memory) {
        return _childrenOf[parentTokenId];
    }

    function getLineage(
        uint256 tokenId
    ) external view returns (uint256[] memory) {
        // Count ancestors
        uint256 count = 0;
        uint256 current = tokenId;
        while (parentOf[current] != 0) {
            count++;
            current = parentOf[current];
        }

        // Build lineage array (from genesis to current)
        uint256[] memory lineage = new uint256[](count + 1);
        lineage[count] = tokenId;

        current = tokenId;
        for (uint256 i = count; i > 0; i--) {
            current = parentOf[current];
            lineage[i - 1] = current;
        }

        return lineage;
    }

    function isDescendantOf(
        uint256 tokenId,
        uint256 ancestorId
    ) external view returns (bool) {
        uint256 current = tokenId;

        while (parentOf[current] != 0) {
            current = parentOf[current];
            if (current == ancestorId) {
                return true;
            }
        }

        return false;
    }

    function withdraw() external {
        require(msg.sender == address(NFT), "Only NFT contract"); // Basic access control
        payable(msg.sender).transfer(address(this).balance);
    }
}
