import { useState } from "react";
import * as Storacha from "@storacha/client";
import { Button, Chip, Stack, Typography } from "@mui/material";

export function ConnectStorageButton() {
  const [busy, setBusy] = useState(false);
  const [did, setDid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setErr(null);
    try {
      const client = await Storacha.create();
      let spaces = await client.spaces();
      if (spaces.length === 0) {
        const email = window.prompt(
          "Enter your email to connect Storacha (magic link):"
        );
        if (!email) throw new Error("Email required");
        await client.login(email as Storacha.Account.EmailAddress);
        const space = await client.createSpace("defork");
        await client.setCurrentSpace(space.did());
        setDid(space.did());
      } else {
        await client.setCurrentSpace(spaces[0].did());
        setDid(spaces[0].did());
      }
    } catch (e: any) {
      setErr(e?.message || "failed to connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button variant="outlined" size="small" disabled={busy} onClick={connect}>
        {busy ? "Connecting…" : "Connect storage"}
      </Button>
      {did && (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          label={`Space: ${did}`}
        />
      )}
      {err && (
        <Typography variant="caption" color="error">
          {err}
        </Typography>
      )}
    </Stack>
  );
}
