import { useState } from "react";
import { Button, Stack, TextField } from "@mui/material";

export function AIText({
  onResult
}: {
  onResult: (text: string, modelId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!prompt) return;
    setBusy(true);
    try {
      // demo text generation (placeholder)
      const text = `AI generated text for: ${prompt}`;
      const modelId = "demo-text-model";
      onResult(text, modelId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems="center"
    >
      <TextField
        size="small"
        label="AI prompt"
        placeholder="Describe the text to generate"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        fullWidth
      />
      <Button
        size="small"
        variant="outlined"
        onClick={generate}
        disabled={busy || !prompt}
      >
        {busy ? "Generating…" : "Generate"}
      </Button>
    </Stack>
  );
}
