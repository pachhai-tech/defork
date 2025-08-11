import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useBalance,
  useWaitForTransactionReceipt
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useToast } from "../lib/toast";
import {
  VOTING_POOL_ADDRESS,
  VOTING_POOL_ABI,
  ERC20_ABI,
  SUPPORTED_TOKENS
} from "../config/contract";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";

interface VotingInterfaceProps {
  tokenId: number;
  onVoteSuccess?: () => void;
}

export function VotingInterface({
  tokenId,
  onVoteSuccess
}: VotingInterfaceProps) {
  const { address } = useAccount();
  const { push } = useToast();
  const [amount, setAmount] = useState("");
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [approvalHash, setApprovalHash] = useState<string>();
  const [voteHash, setVoteHash] = useState<string>();

  const selectedToken = SUPPORTED_TOKENS[selectedTokenIndex];

  const { data: voteStats, refetch: refetchStats } = useReadContract({
    address: VOTING_POOL_ADDRESS,
    abi: VOTING_POOL_ABI,
    functionName: "getTokenStats",
    args: [BigInt(tokenId)]
  });

  const { data: userTier } = useReadContract({
    address: VOTING_POOL_ADDRESS,
    abi: VOTING_POOL_ABI,
    functionName: "getVoterTier",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    token: selectedToken.address
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: selectedToken.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address ? [address, VOTING_POOL_ADDRESS] : undefined,
      query: { enabled: !!address }
    }
  );

  const { writeContract: approve, isPending: isApprovalPending } =
    useWriteContract();
  const { writeContract: vote, isPending: isVotePending } = useWriteContract();

  const { isLoading: isApprovalTxPending } = useWaitForTransactionReceipt({
    hash: approvalHash as `0x${string}`,
    query: { enabled: !!approvalHash }
  });

  const { isLoading: isVoteTxPending } = useWaitForTransactionReceipt({
    hash: voteHash as `0x${string}`,
    query: { enabled: !!voteHash }
  });

  useEffect(() => {
    if (approvalHash && !isApprovalTxPending) {
      refetchAllowance();
      setApprovalHash(undefined);
    }
  }, [approvalHash, isApprovalTxPending, refetchAllowance]);

  useEffect(() => {
    if (voteHash && !isVoteTxPending) {
      refetchStats();
      refetchBalance();
      setAmount("");
      setIsVoting(false);
      setVoteHash(undefined);
      onVoteSuccess?.();
      push({
        kind: "success",
        message: `Vote cast successfully! Royalties have been distributed.`
      });
    }
  }, [
    voteHash,
    isVoteTxPending,
    refetchStats,
    refetchBalance,
    onVoteSuccess,
    push
  ]);

  const tierMultipliers = [1, 2, 5];
  const userMultiplier =
    userTier !== undefined ? tierMultipliers[Number(userTier)] || 1 : 1;
  const votingPower = amount ? parseFloat(amount) * userMultiplier : 0;

  const amountBigInt = amount ? parseUnits(amount, selectedToken.decimals) : 0n;
  const needsApproval =
    currentAllowance !== undefined && amountBigInt > currentAllowance;

  const handleVote = async () => {
    if (!amount || !address) {
      push({
        kind: "error",
        message: "Please enter a valid amount and connect your wallet."
      });
      return;
    }

    try {
      setIsVoting(true);

      if (needsApproval) {
        push({ kind: "info", message: "Approving token spending..." });

        const result = await new Promise<`0x${string}`>((resolve, reject) => {
          approve(
            {
              address: selectedToken.address,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [VOTING_POOL_ADDRESS, amountBigInt]
            },
            {
              onSuccess: (hash) => resolve(hash),
              onError: (error) => reject(error)
            }
          );
        });
        setApprovalHash(result);
        return;
      }

      const result = await new Promise<`0x${string}`>((resolve, reject) => {
        vote(
          {
            address: VOTING_POOL_ADDRESS,
            abi: VOTING_POOL_ABI,
            functionName: "vote",
            args: [BigInt(tokenId), amountBigInt, selectedToken.address]
          },
          {
            onSuccess: (hash) => resolve(hash),
            onError: (error) => reject(error)
          }
        );
      });
      setVoteHash(result);

      push({
        kind: "info",
        message: "Vote transaction sent, waiting for confirmation..."
      });
    } catch (error: any) {
      setIsVoting(false);
      push({
        kind: "error",
        message: error?.message || "Failed to cast vote"
      });
    }
  };

  const formatBalance = (value: bigint, decimals: number) => {
    return parseFloat(formatUnits(value, decimals)).toFixed(4);
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case 0:
        return "Basic";
      case 1:
        return "Premium";
      case 2:
        return "Elite";
      default:
        return "Unknown";
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography fontWeight={800}>💎 Vote for this Content</Typography>
            <Typography variant="body2" color="text.secondary">
              {getTierName(Number(userTier) || 0)} Tier (×{userMultiplier}{" "}
              power)
            </Typography>
          </Stack>
        }
      />
      <CardContent>
        {/* Current Stats */}
        <Stack
          direction="row"
          spacing={2}
          sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1, mb: 2 }}
        >
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              {voteStats ? String(voteStats[0]) : "0"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Votes
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center", flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>
              ${voteStats ? formatBalance(voteStats[1], 18) : "0"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Value
            </Typography>
          </Box>
        </Stack>

        {/* Token Selection */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            Voting Token
          </Typography>
          <Select
            size="small"
            value={selectedTokenIndex}
            onChange={(e) => setSelectedTokenIndex(Number(e.target.value))}
          >
            {SUPPORTED_TOKENS.map((token, index) => (
              <MenuItem key={token.address} value={index}>
                {token.symbol} — {token.name}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        {/* Amount Input */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            Amount to Vote
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              type="number"
              inputProps={{ step: "0.01", min: "0" }}
              placeholder={`0.00 ${selectedToken.symbol}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={() => {
                if (balance) {
                  const maxAmount = formatBalance(
                    balance.value,
                    selectedToken.decimals
                  );
                  setAmount(maxAmount);
                }
              }}
              disabled={!balance}
            >
              Max
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Balance:{" "}
            {balance
              ? formatBalance(balance.value, selectedToken.decimals)
              : "0"}{" "}
            {selectedToken.symbol}
          </Typography>
        </Stack>

        {/* Voting Power Preview */}
        {amount && (
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              Voting Power Calculation
            </Typography>
            <Typography variant="body2">
              {amount} {selectedToken.symbol} × {userMultiplier} (tier
              multiplier) = <strong>{votingPower.toFixed(2)} votes</strong>
            </Typography>
          </Alert>
        )}

        {/* Action Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleVote}
          disabled={
            !amount ||
            !address ||
            isVoting ||
            isApprovalPending ||
            isVotePending ||
            isApprovalTxPending ||
            isVoteTxPending ||
            (balance && amountBigInt > balance.value)
          }
          sx={{ mb: 2 }}
        >
          {isApprovalTxPending
            ? "Approving..."
            : isVoteTxPending
            ? "Voting..."
            : needsApproval
            ? `Approve ${selectedToken.symbol}`
            : `Cast Vote (${votingPower.toFixed(2)} voting power)`}
        </Button>

        <Divider sx={{ my: 1.5 }} />

        {/* Royalty Distribution Info */}
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">
            🎯 Your vote contributes to royalty distribution:
          </Typography>
          <Typography variant="caption">• 5% Genesis Creator</Typography>
          <Typography variant="caption">• Custom Contributor share</Typography>
          <Typography variant="caption">• Equal lineage split</Typography>
          <Typography variant="caption">• 2% Platform development</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
