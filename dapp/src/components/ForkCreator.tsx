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

import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Typography
} from "@mui/material";

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

  const { data: forkCost } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "calculateForkCost",
    args: parentTokenId ? [BigInt(parentTokenId)] : undefined,
    query: { enabled: !!parentTokenId }
  });

  const { data: parentTokenURI } = useReadContract({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: "tokenURI",
    args: parentTokenId ? [BigInt(parentTokenId)] : undefined,
    query: { enabled: !!parentTokenId }
  });

  const { writeContract: mintNFT, isPending: isMintPending } =
    useWriteContract();
  const { writeContract: registerFork, isPending: isForkPending } =
    useWriteContract();
  const { writeContract: setContentHash } = useWriteContract();

  const { isLoading: isMintTxPending, data: mintReceipt } =
    useWaitForTransactionReceipt({
      hash: mintHash as `0x${string}`,
      query: { enabled: !!mintHash }
    });

  const { isLoading: isForkTxPending, data: forkReceipt } =
    useWaitForTransactionReceipt({
      hash: forkHash as `0x${string}`,
      query: { enabled: !!forkHash }
    });

  useEffect(() => {
    if (mintHash && !isMintTxPending && mintReceipt) {
      const genesisEvent = mintReceipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: NFT_ABI,
            data: log.data,
            topics: log.topics
          });
          // @ts-ignore - eventName only exists after successful decode
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
          const tokenId = Number((decoded as any).args.tokenId);
          setNewTokenId(tokenId);

          setContentHashForToken(tokenId);

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

  useEffect(() => {
    if (forkHash && !isForkTxPending && forkReceipt && newTokenId) {
      handleSuccess(newTokenId);
      setForkHash(undefined);
    }
  }, [forkHash, isForkTxPending, forkReceipt, newTokenId]);

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
        if (metadata.name) setTitle(`Fork of: ${metadata.name}`);
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
      push({ kind: "error", message: "Failed to register fork relationship" });
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

      const tokenURI = await uploadJSON(metadata, `content_${Date.now()}.json`);

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
              0, // TEXT
              0, // HUMAN
              "" // no model id
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

  const formatForkCost = () => {
    if (!forkCost) return "...";
    if (typeof forkCost === "bigint") return formatEther(forkCost);
    return "0";
  };

  return (
    <Box component="section">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h6" fontWeight={800}>
          {parentTokenId
            ? `🍴 Fork Content #${parentTokenId}`
            : "✨ Create New Content"}
        </Typography>
        {onClose && (
          <Button size="small" variant="outlined" onClick={onClose}>
            Close
          </Button>
        )}
      </Stack>

      {typeof forkCost === "bigint" && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          💰 Fork cost: {formatForkCost()} ETH
        </Alert>
      )}

      {parentTokenId && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          Forking from Content #{parentTokenId}. This will record on-chain
          lineage.
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your content"
          fullWidth
        />

        <TextField
          label="Content *"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your story, describe your art, or create something amazing..."
          multiline
          minRows={6}
          fullWidth
        />
        <Typography variant="caption" color="text.secondary">
          {content.length} characters
        </Typography>

        <Divider />

        <TextField
          type="number"
          label="Your Contributor Royalty (%)"
          value={contributorRoyalty}
          onChange={(e) => setContributorRoyalty(e.target.value)}
          inputProps={{ min: 0, max: 20, step: 0.1 }}
          helperText="Percentage of future votes you'll receive (max 20%)"
          fullWidth
        />

        <Alert severity="info" variant="outlined">
          <Typography fontWeight={700}>
            📊 Revenue Distribution Preview:
          </Typography>
          <Typography variant="body2">
            • {contributorRoyalty}% - Your contributor royalty
          </Typography>
          {parentTokenId && (
            <Typography variant="body2">
              • 5% - Genesis creator royalty
            </Typography>
          )}
          <Typography variant="body2">
            • ~
            {Math.max(
              0,
              93 -
                parseFloat(contributorRoyalty || "0") -
                (parentTokenId ? 5 : 0)
            )}
            % - Split among all lineage authors
          </Typography>
          <Typography variant="body2">• 2% - Platform development</Typography>
        </Alert>

        <Button
          variant="contained"
          fullWidth
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
        </Button>

        <Divider />

        <Stack spacing={0.5}>
          <Typography variant="caption">
            • Your content will be stored on IPFS
          </Typography>
          <Typography variant="caption">
            • SHA-256 hash stored on-chain for verification
          </Typography>
          <Typography variant="caption">
            • You can receive votes and royalties immediately after creation
          </Typography>
          {parentTokenId && (
            <Typography variant="caption">
              • Fork relationship recorded on-chain permanently
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
