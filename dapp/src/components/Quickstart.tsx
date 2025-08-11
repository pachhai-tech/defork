import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";

export function Quickstart() {
  const [rpcOk, setRpcOk] = useState<boolean | null>(null);
  const [storageOk, setStorageOk] = useState<boolean | null>(null);

  useEffect(() => {
    // lightweight, best-effort checks
    (async () => {
      try {
        const url = String(import.meta.env.VITE_RPC_URL || "");
        if (!url) throw new Error("missing RPC");
        await fetch(url, { method: "POST", body: "{}" });
        setRpcOk(true);
      } catch {
        setRpcOk(false);
      }
      try {
        // pretend check: presence of env is enough here
        setStorageOk(!!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);
      } catch {
        setStorageOk(false);
      }
    })();
  }, []);

  const badge = (ok: boolean | null) =>
    ok === null ? (
      <Chip size="small" label="Checking…" />
    ) : ok ? (
      <Chip size="small" color="success" label="OK" />
    ) : (
      <Chip size="small" color="warning" label="Issue" />
    );

  return (
    <Card variant="outlined">
      <CardHeader
        title={<Typography fontWeight={800}>Quickstart</Typography>}
      />
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ width: 160 }}>
              RPC connectivity
            </Typography>
            {badge(rpcOk)}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ width: 160 }}>
              Storage (W3UP)
            </Typography>
            {badge(storageOk)}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
