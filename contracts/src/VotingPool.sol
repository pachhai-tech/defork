// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStoryForkNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
}

interface IRoyaltyManager {
    function distributeRoyalties(
        uint256 tokenId,
        uint256 amount,
        address token
    ) external;
}

contract VotingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IStoryForkNFT public immutable NFT;
    IRoyaltyManager public immutable ROYALTY_MANAGER;

    // Supported voting tokens
    mapping(address => bool) public supportedTokens;

    // Token ID => total votes received
    mapping(uint256 => uint256) public voteCount;
    mapping(uint256 => uint256) public totalValueVoted;

    // Voter => Token ID => amount voted
    mapping(address => mapping(uint256 => uint256)) public voterAmount;

    // NFT tier system for voting power
    mapping(uint256 => uint8) public nftTier; // 0 = basic, 1 = premium, 2 = elite
    uint256[] public tierMultipliers = [1, 2, 5]; // voting power multipliers

    event VoteCast(
        address indexed voter,
        uint256 indexed tokenId,
        address indexed token,
        uint256 amount,
        uint256 votes,
        uint8 voterTier
    );

    event TokenSupported(address indexed token, bool supported);
    event TierSet(uint256 indexed tokenId, uint8 tier);

    constructor(
        address _nft,
        address _royaltyManager,
        address[] memory _initialTokens
    ) Ownable(msg.sender) {
        NFT = IStoryForkNFT(_nft);
        ROYALTY_MANAGER = IRoyaltyManager(_royaltyManager);

        // Add initial supported tokens (USDC, HBAR equivalent, etc.)
        for (uint i = 0; i < _initialTokens.length; i++) {
            supportedTokens[_initialTokens[i]] = true;
            emit TokenSupported(_initialTokens[i], true);
        }
    }

    function setSupportedToken(
        address token,
        bool supported
    ) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    // Fixed: Changed from setNFTTier to setUserTier for mixedCase
    function setUserTier(uint256 tokenId, uint8 tier) external onlyOwner {
        require(tier < tierMultipliers.length, "Invalid tier");
        nftTier[tokenId] = tier;
        emit TierSet(tokenId, tier);
    }

    function setTierMultipliers(
        uint256[] memory _multipliers
    ) external onlyOwner {
        tierMultipliers = _multipliers;
    }

    function vote(
        uint256 tokenId,
        uint256 amount,
        address token
    ) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be positive");

        // Get voter's NFT tier (highest tier of any NFT they own)
        uint8 voterTier = getVoterTier(msg.sender);

        // Calculate voting power
        uint256 votingPower = amount * tierMultipliers[voterTier];

        IERC20 paymentToken = IERC20(token);

        // Transfer tokens from voter
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update vote tracking
        voteCount[tokenId] += votingPower;
        totalValueVoted[tokenId] += amount;
        voterAmount[msg.sender][tokenId] += amount;

        // Fixed: Use forceApprove instead of safeApprove for newer OpenZeppelin versions
        // Or use the two-step approve pattern
        paymentToken.forceApprove(address(ROYALTY_MANAGER), amount);
        ROYALTY_MANAGER.distributeRoyalties(tokenId, amount, token);

        emit VoteCast(
            msg.sender,
            tokenId,
            token,
            amount,
            votingPower,
            voterTier
        );
    }

    function getVoterTier(address voter) public view returns (uint8) {
        uint256 totalSupply = NFT.totalSupply();
        uint8 highestTier = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            try NFT.ownerOf(i) returns (address owner) {
                if (owner == voter) {
                    uint8 tier = nftTier[i];
                    if (tier > highestTier) {
                        highestTier = tier;
                    }
                }
            } catch {
                // Token doesn't exist or error, continue
                continue;
            }
        }

        return highestTier;
    }

    function getTokenStats(
        uint256 tokenId
    ) external view returns (uint256 votes, uint256 totalValue) {
        return (voteCount[tokenId], totalValueVoted[tokenId]);
    }

    /// @notice Batch vote for multiple tokens
    function batchVote(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        address token
    ) external nonReentrant {
        require(tokenIds.length == amounts.length, "Array length mismatch");
        require(supportedTokens[token], "Token not supported");

        uint8 voterTier = getVoterTier(msg.sender);
        uint256 totalAmount = 0;

        // Calculate total amount needed
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be positive");
            totalAmount += amounts[i];
        }

        IERC20 paymentToken = IERC20(token);

        // Transfer total amount once
        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmount);

        // Process each vote
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];
            uint256 votingPower = amount * tierMultipliers[voterTier];

            // Update vote tracking
            voteCount[tokenId] += votingPower;
            totalValueVoted[tokenId] += amount;
            voterAmount[msg.sender][tokenId] += amount;

            // Distribute royalties for each token
            paymentToken.forceApprove(address(ROYALTY_MANAGER), amount);
            ROYALTY_MANAGER.distributeRoyalties(tokenId, amount, token);

            emit VoteCast(
                msg.sender,
                tokenId,
                token,
                amount,
                votingPower,
                voterTier
            );
        }
    }

    /// @notice Get voting power for a specific amount and user
    function getVotingPower(
        address voter,
        uint256 amount
    ) external view returns (uint256) {
        uint8 tier = getVoterTier(voter);
        return amount * tierMultipliers[tier];
    }

    /// @notice Emergency withdrawal (only owner)
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /// @notice Get all tokens owned by a user (for tier calculation)
    function getUserTokens(
        address user
    ) external view returns (uint256[] memory) {
        uint256 totalSupply = NFT.totalSupply();
        uint256[] memory temp = new uint256[](totalSupply);
        uint256 count = 0;

        for (uint256 i = 1; i <= totalSupply; i++) {
            try NFT.ownerOf(i) returns (address owner) {
                if (owner == user) {
                    temp[count] = i;
                    count++;
                }
            } catch {
                continue;
            }
        }

        uint256[] memory userTokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            userTokens[i] = temp[i];
        }

        return userTokens;
    }
}
