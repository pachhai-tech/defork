// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract StoryForkNFT is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    enum ContentType {
        TEXT,
        IMAGE
    }
    enum ContributionType {
        HUMAN,
        AI,
        COLLAB
    }

    struct Provenance {
        address author;
        ContentType contentType;
        ContributionType contributionType;
        string modelId; // "" if human-only
    }

    uint256 private _tokenIdTracker;
    mapping(uint256 => string) private tokenUris;
    mapping(uint256 => Provenance) public provenance;
    mapping(uint256 => bytes32) public contentHashOf;

    event GenesisCreated(
        uint256 indexed tokenId,
        address indexed author,
        string tokenUri
    );

    event TokenURIUpdated(uint256 indexed tokenId, string newTokenUri);

    mapping(address => bool) public isAdmin;

    event ContentHashSet(uint256 indexed tokenId, bytes32 contentHash);

    constructor(
        address royaltyReceiver,
        uint96 defaultRoyaltyBps
    ) ERC721("StoryForkNFT", "SFORK") Ownable(msg.sender) {
        _setDefaultRoyalty(royaltyReceiver, defaultRoyaltyBps);
    }

    function setAdmin(address user, bool allowed) external onlyOwner {
        isAdmin[user] = allowed;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdTracker;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);
        return tokenUris[tokenId];
    }

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /// @notice Update tokenURI. Allowed: token author, current owner, or admin.
    function setTokenUri(uint256 tokenId, string calldata newUri) external {
        _requireOwned(tokenId);
        address author = provenance[tokenId].author;
        require(
            msg.sender == author ||
                msg.sender == ownerOf(tokenId) ||
                isAdmin[msg.sender],
            "not authorized"
        );
        tokenUris[tokenId] = newUri;
        emit TokenURIUpdated(tokenId, newUri);
    }

    /// @notice Mint a new genesis content NFT with per-token royalty override (optional).
    /// @param to recipient
    /// @param uri full ipfs://... JSON metadata URI
    /// @param royaltyReceiver 0x0 to use default
    /// @param royaltyBps 0 to use default
    /// @param cType TEXT or IMAGE
    /// @param kType HUMAN/AI/COLLAB
    /// @param modelId short id e.g. "llama-3-8b-q4" or "" if human
    function mint(
        address to,
        string calldata uri,
        address royaltyReceiver,
        uint96 royaltyBps,
        ContentType cType,
        ContributionType kType,
        string calldata modelId
    ) external returns (uint256) {
        _tokenIdTracker += 1;
        uint256 newId = _tokenIdTracker;

        _safeMint(to, newId);
        tokenUris[newId] = uri;

        if (royaltyReceiver != address(0) && royaltyBps > 0) {
            _setTokenRoyalty(newId, royaltyReceiver, royaltyBps);
        }

        provenance[newId] = Provenance({
            author: to,
            contentType: cType,
            contributionType: kType,
            modelId: modelId
        });

        emit GenesisCreated(newId, to, uri);
        return newId;
    }

    /// @notice Set SHA-256 content hash for a token. Callable by the token's author or owner.
    function setContentHash(uint256 tokenId, bytes32 contentHash) external {
        _requireOwned(tokenId);
        address author = provenance[tokenId].author;
        require(
            msg.sender == author || msg.sender == ownerOf(tokenId),
            "not authorized"
        );
        contentHashOf[tokenId] = contentHash;
        emit ContentHashSet(tokenId, contentHash);
    }
}
