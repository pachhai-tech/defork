import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { useToast } from "../lib/toast";
import { isAddress, getAddress } from "viem";

import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip
} from "@mui/material";

export function RoleManager() {
  const { address } = useAccount();
  const { push } = useToast();
  const { data: ownerAddr } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "owner"
  });
  const isOwner =
    ownerAddr && address && ownerAddr.toLowerCase() === address.toLowerCase();
  const { writeContract, isPending } = useWriteContract();

  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<"grant" | "revoke">("grant");
  const [checkAddr, setCheckAddr] = useState("");
  const [checkRes, setCheckRes] = useState<boolean | null>(null);

  const { data: isAdminResult } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "isAdmin",
    args:
      checkAddr && isAddress(checkAddr) ? [getAddress(checkAddr)] : undefined,
    query: { enabled: Boolean(checkAddr && isAddress(checkAddr)) }
  });

  useEffect(() => {
    if (isAdminResult !== undefined) {
      setCheckRes(Boolean(isAdminResult));
    }
  }, [isAdminResult]);

  async function submit() {
    if (!isOwner)
      return push({ kind: "error", message: "Connect with the owner wallet" });
    if (!isAddress(target))
      return push({ kind: "error", message: "Invalid address" });
    try {
      await new Promise<void>((resolve, reject) => {
        writeContract(
          {
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: "setAdmin",
            args: [getAddress(target), mode === "grant"]
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error)
          }
        );
      });
      push({
        kind: "success",
        message: `${
          mode === "grant" ? "Granted" : "Revoked"
        } admin: ${getAddress(target)}`
      });
      setTarget("");
    } catch (e: any) {
      push({ kind: "error", message: e.message || "Transaction failed" });
    }
  }

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <Typography fontWeight={800}>Role Manager (Owner-only)</Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Owner:{" "}
            <span style={{ fontFamily: "monospace" }}>{String(ownerAddr)}</span>
          </Typography>
        }
      />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              size="small"
              sx={{ width: 180 }}
            >
              <MenuItem value="grant">Grant admin</MenuItem>
              <MenuItem value="revoke">Revoke admin</MenuItem>
            </Select>
            <TextField
              label="0xAdminAddress"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              sx={{ minWidth: 320, flex: 1 }}
            />
            <Button
              variant="contained"
              disabled={!isOwner || isPending}
              onClick={submit}
            >
              {isPending ? "Sending…" : "Submit"}
            </Button>
          </Stack>

          <Stack
            spacing={1}
            sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}
          >
            <Typography fontWeight={700}>Check Admin Status</Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
            >
              <TextField
                label="0xAddressToCheck"
                value={checkAddr}
                onChange={(e) => setCheckAddr(e.target.value)}
                sx={{ flex: 1 }}
              />
              {checkRes !== null && (
                <Chip
                  size="small"
                  color={checkRes ? "success" : "error"}
                  variant="outlined"
                  label={checkRes ? "Admin" : "Not Admin"}
                />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Tip: only the contract owner can change admin roles. Admins can
              use the Admin Panel but cannot grant other admins.
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
