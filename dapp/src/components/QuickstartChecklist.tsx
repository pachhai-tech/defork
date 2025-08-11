import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import {
  ABI,
  CONTRACT_ADDRESS,
  REGISTRY_ADDRESS,
  VOTING_POOL_ADDRESS
} from "../config/contract";
import { defineChain, createPublicClient, http, isAddress } from "viem";
import {
  Card,
  CardHeader,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
  Tooltip
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

type Check = { label: string; ok: boolean | null; detail?: string };

export function QuickstartChecklist() {
  const { address, isConnected } = useAccount();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list: Check[] = [];

      const env = {
        chainId: import.meta.env.VITE_CHAIN_ID,
        rpc: import.meta.env.VITE_RPC_URL,
        nft: import.meta.env.VITE_NFT_ADDRESS,
        reg: import.meta.env.VITE_REGISTRY_ADDRESS,
        voting: import.meta.env.VITE_VOTING_POOL_ADDRESS,
        royalty: import.meta.env.VITE_ROYALTY_MANAGER_ADDRESS,
        usdc: import.meta.env.VITE_USDC_ADDRESS,
        weth: import.meta.env.VITE_WETH_ADDRESS,
        wc: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      };

      list.push({
        label: ".env: VITE_CHAIN_ID",
        ok: !!env.chainId,
        detail: String(env.chainId || "")
      });
      list.push({
        label: ".env: VITE_RPC_URL",
        ok: !!env.rpc,
        detail: env.rpc || ""
      });
      list.push({
        label: ".env: VITE_NFT_ADDRESS",
        ok: !!env.nft && isAddress(env.nft),
        detail: env.nft || ""
      });
      list.push({
        label: ".env: VITE_REGISTRY_ADDRESS",
        ok: !!env.reg && isAddress(env.reg),
        detail: env.reg || ""
      });
      list.push({
        label: ".env: VITE_VOTING_POOL_ADDRESS",
        ok: !!env.voting && isAddress(env.voting),
        detail: env.voting || ""
      });
      list.push({
        label: ".env: VITE_ROYALTY_MANAGER_ADDRESS",
        ok: !!env.royalty && isAddress(env.royalty),
        detail: env.royalty || ""
      });
      list.push({
        label: ".env: VITE_USDC_ADDRESS",
        ok: !!env.usdc && isAddress(env.usdc),
        detail: env.usdc || ""
      });
      list.push({
        label: ".env: VITE_WETH_ADDRESS",
        ok: !!env.weth && isAddress(env.weth),
        detail: env.weth || ""
      });
      list.push({
        label: ".env: VITE_WALLETCONNECT_PROJECT_ID",
        ok: !!env.wc,
        detail: env.wc ? "present" : "missing"
      });

      list.push({
        label: "Wallet connected",
        ok: isConnected,
        detail: isConnected ? String(address) : "not connected"
      });

      try {
        const chain = defineChain({
          id: Number(env.chainId || 0),
          name: "Configured Chain",
          nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 },
          rpcUrls: { default: { http: [env.rpc || ""] } }
        });
        const client = createPublicClient({
          chain,
          transport: http(env.rpc || "")
        });
        const bn = await client.getBlockNumber();
        list.push({
          label: "RPC reachable",
          ok: typeof bn === "bigint",
          detail: typeof bn === "bigint" ? `block ${bn}` : "failed"
        });
      } catch (e: any) {
        list.push({
          label: "RPC reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      try {
        const ts = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "totalSupply"
        })) as bigint;
        list.push({
          label: "NFT Contract reachable",
          ok: true,
          detail: `totalSupply=${ts.toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "NFT Contract reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      try {
        const parent = (await readContract(config, {
          address: REGISTRY_ADDRESS,
          abi: [
            {
              type: "function",
              name: "parentOf",
              stateMutability: "view",
              inputs: [{ name: "tokenId", type: "uint256" }],
              outputs: [{ type: "uint256" }]
            }
          ],
          functionName: "parentOf",
          args: [BigInt(1)]
        })) as bigint;
        list.push({
          label: "Registry Contract reachable",
          ok: true,
          detail: `parentOf(1)=${parent.toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "Registry Contract reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      try {
        const stats = (await readContract(config, {
          address: VOTING_POOL_ADDRESS,
          abi: [
            {
              type: "function",
              name: "getTokenStats",
              stateMutability: "view",
              inputs: [{ name: "tokenId", type: "uint256" }],
              outputs: [
                { name: "votes", type: "uint256" },
                { name: "totalValue", type: "uint256" }
              ]
            }
          ],
          functionName: "getTokenStats",
          args: [BigInt(1)]
        })) as [bigint, bigint];
        list.push({
          label: "Voting Pool Contract reachable",
          ok: true,
          detail: `token1 votes=${stats[0].toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "Voting Pool Contract reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      setChecks(list);
      setLoading(false);
    })();
  }, [address, isConnected]);

  const allGood = checks.every((c) => c.ok === true);
  const hasErrors = checks.some((c) => c.ok === false);
  const okCount = useMemo(
    () => checks.filter((c) => c.ok === true).length,
    [checks]
  );

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={700}>
              Quickstart Checklist
            </Typography>
            <Chip
              size="small"
              color={
                loading
                  ? "default"
                  : allGood
                  ? "success"
                  : hasErrors
                  ? "warning"
                  : "default"
              }
              label={
                loading
                  ? "Checking…"
                  : allGood
                  ? "All systems ready"
                  : hasErrors
                  ? "Issues detected"
                  : "Partial"
              }
              variant={allGood ? "filled" : "outlined"}
            />
            {!loading && (
              <Typography variant="caption" color="text.secondary">
                ({okCount}/{checks.length})
              </Typography>
            )}
          </Stack>
        }
        action={
          <Tooltip title={open ? "Hide details" : "Show details"}>
            <IconButton onClick={() => setOpen((v) => !v)} size="small">
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        }
      />
      <Collapse in={open} timeout="auto" unmountOnExit>
        <CardContent>
          <Stack spacing={1}>
            {checks.map((c, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">
                  {c.ok === true ? "✅" : c.ok === false ? "❌" : "⏳"}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {c.label}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ wordBreak: "break-all", maxWidth: 360 }}
                >
                  {c.detail}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {hasErrors && (
            <Stack spacing={0.5} mt={2}>
              <Typography variant="subtitle2">Fix issues:</Typography>
              <Typography variant="caption">
                • Update .env with correct contract addresses
              </Typography>
              <Typography variant="caption">
                • Ensure you’re on the right network (check VITE_CHAIN_ID)
              </Typography>
              <Typography variant="caption">
                • Deploy contracts if they don’t exist
              </Typography>
              <Typography variant="caption">
                • Check RPC endpoint connectivity
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
}
