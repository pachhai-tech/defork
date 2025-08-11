// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStoryForkNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function provenance(
        uint256 tokenId
    )
        external
        view
        returns (
            address author,
            uint8 contentType,
            uint8 contributionType,
            string memory modelId
        );
}

interface IForkRegistry {
    function parentOf(uint256 tokenId) external view returns (uint256);
    function getLineage(
        uint256 tokenId
    ) external view returns (uint256[] memory);
}

contract RoyaltyManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20; // Fixed: Use SafeERC20 for all transfers

    IStoryForkNFT public immutable NFT;
    IForkRegistry public immutable FORK_REGISTRY;

    // Royalty percentages (basis points: 100 = 1%)
    uint256 public genesisRoyaltyBps = 500; // 5% to genesis creator
    uint256 public platformFeeBps = 200; // 2% to platform treasury

    // Custom contributor royalties per token
    mapping(uint256 => uint256) public contributorRoyaltyBps;

    // Genesis token tracking
    mapping(uint256 => uint256) public genesisToken;

    address public treasury;

    event RoyaltyDistributed(
        uint256 indexed tokenId,
        address indexed token,
        uint256 totalAmount,
        uint256 genesisAmount,
        uint256 contributorAmount,
        uint256 collaboratorAmount,
        uint256 platformFee
    );

    event GenesisSet(uint256 indexed tokenId, uint256 indexed genesisTokenId);
    event ContributorRoyaltySet(uint256 indexed tokenId, uint256 royaltyBps);

    constructor(
        address _nft,
        address _forkRegistry,
        address _treasury
    ) Ownable(msg.sender) {
        NFT = IStoryForkNFT(_nft);
        FORK_REGISTRY = IForkRegistry(_forkRegistry);
        treasury = _treasury;
    }

    function setGenesisRoyalty(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Max 10%");
        genesisRoyaltyBps = _bps;
    }

    function setPlatformFee(uint256 _bps) external onlyOwner {
        require(_bps <= 500, "Max 5%");
        platformFeeBps = _bps;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setContributorRoyalty(
        uint256 tokenId,
        uint256 royaltyBps
    ) external {
        (address author, , , ) = NFT.provenance(tokenId);
        require(
            msg.sender == author || msg.sender == NFT.ownerOf(tokenId),
            "Not authorized"
        );
        require(royaltyBps <= 2000, "Max 20%");

        contributorRoyaltyBps[tokenId] = royaltyBps;
        emit ContributorRoyaltySet(tokenId, royaltyBps);
    }

    function setGenesisToken(
        uint256 tokenId,
        uint256 genesisTokenId
    ) external onlyOwner {
        genesisToken[tokenId] = genesisTokenId;
        emit GenesisSet(tokenId, genesisTokenId);
    }

    function distributeRoyalties(
        uint256 tokenId,
        uint256 amount,
        address token
    ) external nonReentrant {
        require(amount > 0, "Amount must be positive");

        IERC20 paymentToken = IERC20(token);
        // Fixed: Use safeTransferFrom instead of transferFrom
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 remaining = amount;

        // 1. Platform fee
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        if (platformFee > 0 && treasury != address(0)) {
            // Fixed: Use safeTransfer instead of transfer
            paymentToken.safeTransfer(treasury, platformFee);
            remaining -= platformFee;
        }

        // 2. Genesis royalty
        uint256 genesisAmount = 0;
        uint256 genesis = findGenesisToken(tokenId);
        if (genesis != 0) {
            genesisAmount = (amount * genesisRoyaltyBps) / 10000;
            if (genesisAmount > 0) {
                (address genesisAuthor, , , ) = NFT.provenance(genesis);
                // Fixed: Use safeTransfer instead of transfer
                paymentToken.safeTransfer(genesisAuthor, genesisAmount);
                remaining -= genesisAmount;
            }
        }

        // 3. Contributor royalty
        uint256 contributorAmount = 0;
        uint256 contributorBps = contributorRoyaltyBps[tokenId];
        if (contributorBps > 0) {
            contributorAmount = (amount * contributorBps) / 10000;
            if (contributorAmount > 0) {
                (address author, , , ) = NFT.provenance(tokenId);
                // Fixed: Use safeTransfer instead of transfer
                paymentToken.safeTransfer(author, contributorAmount);
                remaining -= contributorAmount;
            }
        }

        // 4. Collaborator share (split among all authors in lineage)
        uint256 collaboratorAmount = remaining;
        if (collaboratorAmount > 0) {
            distributeCollaboratorShare(tokenId, collaboratorAmount, token);
        }

        emit RoyaltyDistributed(
            tokenId,
            token,
            amount,
            genesisAmount,
            contributorAmount,
            collaboratorAmount,
            platformFee
        );
    }

    function distributeCollaboratorShare(
        uint256 tokenId,
        uint256 amount,
        address token
    ) internal {
        uint256[] memory lineage = getLineageAuthors(tokenId);

        if (lineage.length == 0) {
            // Fallback to current token author
            (address author, , , ) = NFT.provenance(tokenId);
            // Fixed: Use safeTransfer instead of transfer
            IERC20(token).safeTransfer(author, amount);
            return;
        }

        uint256 sharePerAuthor = amount / lineage.length;
        uint256 remainder = amount % lineage.length;

        IERC20 paymentToken = IERC20(token);

        for (uint256 i = 0; i < lineage.length; i++) {
            (address author, , , ) = NFT.provenance(lineage[i]);
            uint256 share = sharePerAuthor;

            // Give remainder to first author
            if (i == 0) {
                share += remainder;
            }

            // Fixed: Use safeTransfer instead of transfer
            paymentToken.safeTransfer(author, share);
        }
    }

    function findGenesisToken(uint256 tokenId) public view returns (uint256) {
        // Check if manually set
        if (genesisToken[tokenId] != 0) {
            return genesisToken[tokenId];
        }

        // Traverse up the lineage to find root
        uint256 current = tokenId;
        uint256 parent = FORK_REGISTRY.parentOf(current);

        while (parent != 0) {
            current = parent;
            parent = FORK_REGISTRY.parentOf(current);
        }

        return current;
    }

    function getLineageAuthors(
        uint256 tokenId
    ) public view returns (uint256[] memory) {
        // Get all tokens in the lineage up to genesis
        uint256[] memory lineage = new uint256[](50); // Max depth
        uint256 count = 0;

        uint256 current = tokenId;
        lineage[count++] = current;

        uint256 parent = FORK_REGISTRY.parentOf(current);
        while (parent != 0 && count < 50) {
            lineage[count++] = parent;
            current = parent;
            parent = FORK_REGISTRY.parentOf(current);
        }

        // Create properly sized array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = lineage[i];
        }

        return result;
    }

    // Additional helper functions for better integration

    /// @notice Get royalty breakdown for a given token and amount
    function getRoyaltyBreakdown(
        uint256 tokenId,
        uint256 amount
    )
        external
        view
        returns (
            uint256 platformFee,
            uint256 genesisAmount,
            uint256 contributorAmount,
            uint256 collaboratorAmount
        )
    {
        platformFee = (amount * platformFeeBps) / 10000;

        uint256 genesis = findGenesisToken(tokenId);
        if (genesis != 0) {
            genesisAmount = (amount * genesisRoyaltyBps) / 10000;
        }

        uint256 contributorBps = contributorRoyaltyBps[tokenId];
        if (contributorBps > 0) {
            contributorAmount = (amount * contributorBps) / 10000;
        }

        collaboratorAmount =
            amount -
            platformFee -
            genesisAmount -
            contributorAmount;
    }

    /// @notice Emergency withdrawal function (only owner)
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /// @notice Get total lineage count for a token
    function getLineageCount(uint256 tokenId) external view returns (uint256) {
        uint256 count = 0;
        uint256 current = tokenId;

        while (current != 0) {
            count++;
            current = FORK_REGISTRY.parentOf(current);
            if (count > 50) break; // Prevent infinite loops
        }

        return count;
    }
}
