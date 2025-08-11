import { useEffect, useState } from "react";
import {
  createPublicClient,
  defineChain,
  http,
  decodeEventLog,
  type Log
} from "viem";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Link,
  Stack,
  Typography
} from "@mui/material";

type Decoded = {
  blockNumber: bigint;
  txHash: `0x${string}`;
  eventName: string;
  args: Record<string, unknown>;
};

export function AuditLog() {
  const [rows, setRows] = useState<Decoded[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const chain = defineChain({
          id: Number(import.meta.env.VITE_CHAIN_ID || 0),
          name: "Configured",
          nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 },
          rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL || ""] } }
        });
        const client = createPublicClient({
          chain,
          transport: http(import.meta.env.VITE_RPC_URL || "")
        });

        const latest = await client.getBlockNumber();
        const span = 10_000n;
        const fromBlock = latest > span ? latest - span : 0n;

        const logs = await client.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock,
          toBlock: latest
        });

        const decoded: Decoded[] = [];
        for (const log of logs as Log[]) {
          try {
            const d = decodeEventLog({
              abi: ABI,
              data: log.data,
              topics: log.topics
            });
            decoded.push({
              blockNumber: log.blockNumber!,
              txHash: log.transactionHash!,
              eventName: d.eventName,
              args: (d.args || {}) as any
            });
          } catch {
            // ignore unrecognized events
          }
        }

        decoded.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
        setRows(decoded.slice(0, 100));
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatArgs = (args: Record<string, unknown>) => {
    const formatted: Record<string, string> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "bigint") {
        formatted[key] = value.toString();
      } else if (typeof value === "string" && value.startsWith("0x")) {
        formatted[key] =
          value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
      } else {
        formatted[key] = String(value);
      }
    }
    return formatted;
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title={<Typography fontWeight={800}>Contract Activity</Typography>}
        subheader={
          loading
            ? "Loading logs…"
            : rows.length === 0
            ? "No recent events."
            : undefined
        }
      />
      <CardContent>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <Stack spacing={1.5} sx={{ maxHeight: 400, overflowY: "auto" }}>
          {rows.map((r, i) => (
            <Box
              key={`${r.txHash}-${i}`}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 1.5
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography fontWeight={700} variant="body2">
                  {r.eventName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Block {r.blockNumber.toString()}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ wordBreak: "break-all", mb: 1 }}
              >
                tx:{" "}
                <Link
                  href={`https://hashscan.io/testnet/transaction/${r.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {r.txHash}
                </Link>
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: "grey.50",
                  p: 1,
                  borderRadius: 1,
                  overflow: "auto",
                  fontSize: "0.75rem",
                  m: 0
                }}
              >
                {JSON.stringify(formatArgs(r.args), null, 2)}
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
