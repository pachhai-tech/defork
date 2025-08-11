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

  // Read current vote stats
  const { data: voteStats, refetch: refetchStats } = useReadContract({
    address: VOTING_POOL_ADDRESS,
    abi: VOTING_POOL_ABI,
    functionName: "getTokenStats",
    args: [BigInt(tokenId)]
  });

  // Read user's NFT tier
  const { data: userTier } = useReadContract({
    address: VOTING_POOL_ADDRESS,
    abi: VOTING_POOL_ABI,
    functionName: "getVoterTier",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // Get user's token balance
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    token: selectedToken.address
  });

  // Check current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: selectedToken.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: address ? [address, VOTING_POOL_ADDRESS] : undefined,
      query: { enabled: !!address }
    }
  );

  // Write functions
  const { writeContract: approve, isPending: isApprovalPending } =
    useWriteContract();
  const { writeContract: vote, isPending: isVotePending } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApprovalTxPending } = useWaitForTransactionReceipt({
    hash: approvalHash as `0x${string}`,
    query: { enabled: !!approvalHash }
  });

  // Wait for vote transaction
  const { isLoading: isVoteTxPending } = useWaitForTransactionReceipt({
    hash: voteHash as `0x${string}`,
    query: { enabled: !!voteHash }
  });

  // Handle approval success
  useEffect(() => {
    if (approvalHash && !isApprovalTxPending) {
      refetchAllowance();
      setApprovalHash(undefined);
    }
  }, [approvalHash, isApprovalTxPending, refetchAllowance]);

  // Handle vote success
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

      // Check if we need approval first
      if (needsApproval) {
        push({
          kind: "info",
          message: "Approving token spending..."
        });

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

      // Cast the vote
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
    <section className="space-y-4 border rounded p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">💎 Vote for this Content</h3>
        <div className="text-sm opacity-70">
          {getTierName(Number(userTier) || 0)} Tier (×{userMultiplier} power)
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
        <div className="text-center">
          <div className="text-2xl font-bold">
            {voteStats ? String(voteStats[0]) : "0"}
          </div>
          <div className="text-sm opacity-70">Total Votes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            ${voteStats ? formatBalance(voteStats[1], 18) : "0"}
          </div>
          <div className="text-sm opacity-70">Total Value</div>
        </div>
      </div>

      {/* Token Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Voting Token</label>
        <select
          className="border rounded p-2 w-full"
          value={selectedTokenIndex}
          onChange={(e) => setSelectedTokenIndex(Number(e.target.value))}
        >
          {SUPPORTED_TOKENS.map((token, index) => (
            <option key={token.address} value={index}>
              {token.symbol} - {token.name}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount to Vote</label>
        <div className="flex gap-2">
          <input
            type="number"
            className="border rounded p-2 flex-1"
            placeholder={`0.00 ${selectedToken.symbol}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
          <button
            className="px-3 py-1 border rounded text-sm"
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
          </button>
        </div>

        <div className="text-sm opacity-70">
          Balance:{" "}
          {balance ? formatBalance(balance.value, selectedToken.decimals) : "0"}{" "}
          {selectedToken.symbol}
        </div>
      </div>

      {/* Voting Power Preview */}
      {amount && (
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <div className="text-sm font-medium text-blue-900 mb-1">
            Voting Power Calculation
          </div>
          <div className="text-sm text-blue-700">
            {amount} {selectedToken.symbol} × {userMultiplier} (tier multiplier)
            = <strong>{votingPower.toFixed(2)} votes</strong>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
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
        className="w-full px-4 py-2 border rounded font-medium disabled:opacity-50"
      >
        {isApprovalTxPending
          ? "Approving..."
          : isVoteTxPending
          ? "Voting..."
          : needsApproval
          ? `Approve ${selectedToken.symbol}`
          : `Cast Vote (${votingPower.toFixed(2)} voting power)`}
      </button>

      {/* Royalty Distribution Info */}
      <div className="text-xs opacity-70 border-t pt-3 space-y-1">
        <div className="font-medium mb-2">
          🎯 Your vote contributes to royalty distribution:
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>• 5% Genesis Creator</div>
          <div>• Custom Contributor share</div>
          <div>• Equal lineage split</div>
          <div>• 2% Platform development</div>
        </div>
      </div>
    </section>
  );
}
