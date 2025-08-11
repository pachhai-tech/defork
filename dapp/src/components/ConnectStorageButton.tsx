import { useState } from "react";
import * as Storacha from "@storacha/client";

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
        await client.login(email as Storacha.Account.EmailAddress); // user clicks magic link in email
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
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-1 border rounded"
        disabled={busy}
        onClick={connect}
      >
        {busy ? "Connecting…" : "Connect storage"}
      </button>
      {did && <span className="text-xs opacity-70">Space: {did}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
