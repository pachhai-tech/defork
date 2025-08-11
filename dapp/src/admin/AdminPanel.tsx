import React, { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { CONTRACT_ADDRESS, ABI } from "../config/contract";
import { useToast } from "../lib/toast";
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Alert
} from "@mui/material";

// Simple allowlist - add your admin addresses here
const ALLOWLIST = ["0xe3c0743e01bE37c42B2ee57BD1aA30c9c266c0Ae", "anujad12"];

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
      ALLOWLIST.includes("anujad12"));

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
        functionName: "setTokenUri",
        args: [BigInt(tokenId), hidden ? "hidden" : "visible"]
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
      <Alert severity="error" variant="outlined">
        <Typography fontWeight={700} component="div">
          Admin Panel
        </Typography>
        Not authorized. Connect with an admin wallet.
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Current address: {address || "None"}
        </Typography>
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader
        title={<Typography fontWeight={800}>Admin Panel</Typography>}
      />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="Token ID"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Enter token ID to moderate"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
              />
            }
            label="Mark as hidden"
          />
          <Button
            variant="contained"
            onClick={toggleHidden}
            disabled={isPending || !tokenId}
          >
            {isPending ? "Processing..." : "Toggle Visibility"}
          </Button>

          {status && (
            <Typography
              variant="body2"
              sx={{ mt: 1, p: 1, bgcolor: "grey.100", borderRadius: 1 }}
            >
              {status}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
