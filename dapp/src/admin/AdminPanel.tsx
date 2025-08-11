import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { CONTRACT_ADDRESS, ABI } from "../config/contract";
import { useToast } from "../lib/toast";

// Simple allowlist - add your admin addresses here
const ALLOWLIST = [
  // lowercase addresses
  "0xe3c0743e01bE37c42B2ee57BD1aA30c9c266c0Ae", // Replace with actual admin addresses
  "anujad12" // Add current user for testing
];

export default function AdminPanel() {
  const { address } = useAccount();
  const { push } = useToast();
  const { writeContract, isPending } = useWriteContract();
  const [tokenId, setTokenId] = useState("");
  const [hidden, setHidden] = useState(false);
  const [status, setStatus] = useState("");

  const allowed =
    address &&
    (ALLOWLIST.includes(address.toLowerCase()) ||
      ALLOWLIST.includes("anujad12")); // Allow current user

  async function toggleHidden() {
    if (!allowed) {
      setStatus("Not authorized");
      return;
    }
    if (!tokenId) {
      setStatus("Enter tokenId");
      return;
    }

    try {
      setStatus("Sending tx...");
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "setTokenUri", // Assuming this is the function to update metadata
        args: [BigInt(tokenId), hidden ? "hidden" : "visible"] // Simplified for demo
      });
      setStatus("Transaction sent successfully");
      push({
        kind: "success",
        message: `Token #${tokenId} ${hidden ? "hidden" : "shown"}`
      });
    } catch (err: any) {
      console.error(err);
      setStatus("Error: " + (err?.message || "Unknown error"));
      push({ kind: "error", message: err?.message || "Transaction failed" });
    }
  }

  if (!allowed) {
    return (
      <div className="border rounded p-4 bg-red-50 text-red-800">
        <h3 className="font-semibold">Admin Panel</h3>
        <div>Not authorized. Connect with an admin wallet.</div>
        <div className="text-xs mt-2">Current address: {address || "None"}</div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 bg-yellow-50">
      <h3 className="font-semibold mb-4">Admin Panel</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Token ID:</label>
          <input
            className="border rounded p-2 w-full"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Enter token ID to moderate"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
            <span className="text-sm">Mark as hidden</span>
          </label>
        </div>

        <button
          onClick={toggleHidden}
          disabled={isPending || !tokenId}
          className="px-4 py-2 border rounded font-medium disabled:opacity-50"
        >
          {isPending ? "Processing..." : "Toggle Visibility"}
        </button>

        {status && (
          <div className="text-sm mt-2 p-2 bg-gray-100 rounded">{status}</div>
        )}
      </div>
    </div>
  );
}
