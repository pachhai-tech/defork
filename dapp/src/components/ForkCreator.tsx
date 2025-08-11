import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt
} from "wagmi";
import { parseEther, formatEther, decodeEventLog } from "viem";
import { useToast } from "../lib/toast";
import { uploadJSON } from "../lib/ipfs";
import { sha256Text } from "../lib/utils";
import {
  NFT_ADDRESS,
  NFT_ABI,
  REGISTRY_ADDRESS,
  REGISTRY_ABI
} from "../config/contract";

interface ForkCreatorProps {
  parentTokenId?: number;
  onSuccess?: (tokenId: number) => void;
  onClose?: () => void;
}

export function ForkCreator({
  parentTokenId,
  onSuccess,
  onClose
}: ForkCreatorProps) {
  const { address } = useAccount();
  const { push } = useToast();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [contributorRoyalty, setContributorRoyalty] = useState("5");
  const [isCreating, setIsCreating] = useState(false);
  const [mintHash, setMintHash] = useState<string>();
  const [forkHash, setForkHash] = useState<string>();
  const [newTokenId, setNewTokenId] = useState<number>();

  // Get fork cost if this is a fork
  const { data: forkCost } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "calculateForkCost",
    args: parentTokenId ? [BigInt(parentTokenId)] : undefined,
    query: { enabled: !!parentTokenId }
  });

  // Get parent content details
  const { data: parentTokenURI } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: "tokenURI",
    args: parentTokenId ? [BigInt(parentTokenId)] : undefined,
    query: { enabled: !!parentTokenId }
  });

  // Write functions
  const { writeContract: mintNFT, isPending: isMintPending } =
    useWriteContract();
  const { writeContract: registerFork, isPending: isForkPending } =
    useWriteContract();
  const { writeContract: setContentHash } = useWriteContract();

  // Wait for mint transaction
  const { isLoading: isMintTxPending, data: mintReceipt } =
    useWaitForTransactionReceipt({
      hash: mintHash as `0x${string}`,
      query: { enabled: !!mintHash }
    });

  // Wait for fork registration
  const { isLoading: isForkTxPending, data: forkReceipt } =
    useWaitForTransactionReceipt({
      hash: forkHash as `0x${string}`,
      query: { enabled: !!forkHash }
    });

  // Handle mint success
  useEffect(() => {
    if (mintHash && !isMintTxPending && mintReceipt) {
      // Extract token ID from GenesisCreated event
      const genesisEvent = mintReceipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: NFT_ABI,
            data: log.data,
            topics: log.topics
          });
          return decoded.eventName === "GenesisCreated";
        } catch {
          return false;
        }
      });

      if (genesisEvent) {
        try {
          const decoded = decodeEventLog({
            abi: NFT_ABI,
            data: genesisEvent.data,
            topics: genesisEvent.topics
          });
          const tokenId = Number(decoded.args.tokenId);
          setNewTokenId(tokenId);

          // Set content hash
          setContentHashForToken(tokenId);

          // Register fork if this is a fork
          if (parentTokenId && forkCost) {
            registerForkRelation(tokenId);
          } else {
            handleSuccess(tokenId);
          }
        } catch (error) {
          console.error("Failed to decode event:", error);
          setIsCreating(false);
        }
      }
      setMintHash(undefined);
    }
  }, [mintHash, isMintTxPending, mintReceipt]);

  // Handle fork registration success
  useEffect(() => {
    if (forkHash && !isForkTxPending && forkReceipt && newTokenId) {
      handleSuccess(newTokenId);
      setForkHash(undefined);
    }
  }, [forkHash, isForkTxPending, forkReceipt, newTokenId]);

  // Load parent content for fork context
  useEffect(() => {
    if (parentTokenURI && parentTokenId) {
      loadParentContent(parentTokenURI as string);
    }
  }, [parentTokenURI, parentTokenId]);

  const loadParentContent = async (tokenURI: string) => {
    try {
      if (tokenURI.startsWith("ipfs://")) {
        const cid = tokenURI.replace("ipfs://", "");
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        const metadata = await response.json();

        if (metadata.name) {
          setTitle(`Fork of: ${metadata.name}`);
        }
      }
    } catch (error) {
      console.error("Failed to load parent content:", error);
    }
  };

  const setContentHashForToken = async (tokenId: number) => {
    try {
      const contentHash = await sha256Text(content);
      await new Promise<void>((resolve, reject) => {
        setContentHash(
          {
            address: NFT_ADDRESS,
            abi: NFT_ABI,
            functionName: "setContentHash",
            args: [BigInt(tokenId), contentHash as `0x${string}`]
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error)
          }
        );
      });
    } catch (error) {
      console.error("Failed to set content hash:", error);
    }
  };

  const registerForkRelation = async (tokenId: number) => {
    try {
      const result = await new Promise<`0x${string}`>((resolve, reject) => {
        registerFork(
          {
            address: REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: "registerFork",
            args: [BigInt(parentTokenId!), BigInt(tokenId)],
            value: forkCost as bigint
          },
          {
            onSuccess: (hash) => resolve(hash),
            onError: (error) => reject(error)
          }
        );
      });
      setForkHash(result);
    } catch (error) {
      console.error("Failed to register fork:", error);
      setIsCreating(false);
      push({
        kind: "error",
        message: "Failed to register fork relationship"
      });
    }
  };

  const handleSuccess = (tokenId: number) => {
    setIsCreating(false);
    push({
      kind: "success",
      message: parentTokenId
        ? `Fork #${tokenId} created successfully!`
        : `Content #${tokenId} created successfully!`
    });

    onSuccess?.(tokenId);

    // Reset form
    setContent("");
    setTitle("");
    setContributorRoyalty("5");
    setNewTokenId(undefined);
  };

  const handleCreateContent = async () => {
    if (!content || !title || !address) {
      push({
        kind: "error",
        message: "Please fill in all required fields and connect your wallet."
      });
      return;
    }

    try {
      setIsCreating(true);

      // Create metadata
      const metadata = {
        name: title,
        description: content,
        contentType: "text/plain",
        contributionType: "human",
        parentTokenId: parentTokenId || null,
        authors: [
          {
            address,
            royalty: parseFloat(contributorRoyalty) / 100,
            credit: parentTokenId ? "Fork Contributor" : "Genesis Creator"
          }
        ],
        timestamp: Date.now(),
        attributes: [
          { trait_type: "Content Type", value: "Text" },
          { trait_type: "Contribution Type", value: "Human" },
          {
            trait_type: "Fork Generation",
            value: parentTokenId ? "Fork" : "Genesis"
          }
        ]
      };

      // Upload to IPFS
      const tokenURI = await uploadJSON(metadata, `content_${Date.now()}.json`);

      // Mint NFT
      const royaltyBps = BigInt(
        Math.floor(parseFloat(contributorRoyalty) * 100)
      );

      const result = await new Promise<`0x${string}`>((resolve, reject) => {
        mintNFT(
          {
            address: NFT_ADDRESS,
            abi: NFT_ABI,
            functionName: "mint",
            args: [
              address,
              tokenURI,
              address, // royalty receiver
              royaltyBps,
              0, // TEXT content type
              0, // HUMAN contribution type
              "" // no model ID for human content
            ]
          },
          {
            onSuccess: (hash) => resolve(hash),
            onError: (error) => reject(error)
          }
        );
      });

      setMintHash(result);

      push({
        kind: "info",
        message: "Transaction sent, waiting for confirmation..."
      });
    } catch (error: any) {
      setIsCreating(false);
      push({
        kind: "error",
        message: error?.message || "Failed to create content"
      });
    }
  };

  // Format fork cost safely
  const formatForkCost = () => {
    if (!forkCost) return "...";
    if (typeof forkCost === "bigint") {
      return formatEther(forkCost);
    }
    return "0";
  };

  return (
    <section className="space-y-4 border rounded p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {parentTokenId
            ? `🍴 Fork Content #${parentTokenId}`
            : "✨ Create New Content"}
        </h3>
        {onClose && (
          <button onClick={onClose} className="px-2 py-1 border rounded">
            ×
          </button>
        )}
      </div>

      {typeof forkCost === "bigint" && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          💰 Fork cost: {formatForkCost()} ETH
        </div>
      )}

      {/* Parent content preview */}
      {parentTokenId && (
        <div className="p-3 bg-gray-50 rounded border">
          <div className="text-sm font-medium mb-1">
            Forking from Content #{parentTokenId}
          </div>
          <div className="text-xs opacity-70">
            This will create a new branch in the content tree with on-chain
            lineage tracking.
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Title *</label>
        <input
          type="text"
          className="border rounded p-2 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your content"
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Content *</label>
        <textarea
          className="border rounded p-2 w-full resize-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your story, describe your art, or create something amazing..."
          rows={6}
        />
        <div className="text-xs opacity-70">{content.length} characters</div>
      </div>

      {/* Contributor Royalty */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Your Contributor Royalty (%)
        </label>
        <input
          type="number"
          className="border rounded p-2 w-full"
          value={contributorRoyalty}
          onChange={(e) => setContributorRoyalty(e.target.value)}
          min="0"
          max="20"
          step="0.1"
        />
        <div className="text-xs opacity-70">
          Percentage of future votes you'll receive (max 20%)
        </div>
      </div>

      {/* Royalty Breakdown */}
      <div className="p-3 bg-blue-50 rounded border border-blue-200">
        <div className="font-medium text-blue-900 mb-2">
          📊 Revenue Distribution Preview:
        </div>
        <div className="space-y-1 text-sm text-blue-700">
          <div>• {contributorRoyalty}% - Your contributor royalty</div>
          {parentTokenId && <div>• 5% - Genesis creator royalty</div>}
          <div>
            • ~
            {Math.max(
              0,
              93 - parseFloat(contributorRoyalty) - (parentTokenId ? 5 : 0)
            )}
            % - Split among all lineage authors
          </div>
          <div>• 2% - Platform development</div>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={handleCreateContent}
        disabled={
          !content ||
          !title ||
          !address ||
          isCreating ||
          isMintPending ||
          isForkPending ||
          isMintTxPending ||
          isForkTxPending
        }
        className="w-full px-4 py-2 border rounded font-medium disabled:opacity-50"
      >
        {isMintTxPending
          ? "Minting NFT..."
          : isForkTxPending
          ? "Registering Fork..."
          : isCreating
          ? "Creating..."
          : parentTokenId
          ? `Create Fork (${formatForkCost()} ETH)`
          : "Create Content"}
      </button>

      {/* Additional Info */}
      <div className="text-xs opacity-70 space-y-1 border-t pt-3">
        <div>
          • Your content will be stored on IPFS for decentralized access
        </div>
        <div>• SHA-256 hash will be stored on-chain for verification</div>
        <div>
          • You can receive votes and royalties immediately after creation
        </div>
        {parentTokenId && (
          <div>• Fork relationship will be recorded permanently on-chain</div>
        )}
      </div>
    </section>
  );
}
