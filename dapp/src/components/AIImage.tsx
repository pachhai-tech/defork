import { useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";

export function AIImage({
  onResult
}: {
  onResult: (blob: Blob, modelId: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    if (!prompt) return;
    setLoading(true);
    setErr(null);
    try {
      // Load remote ESM with a variable URL and vite-ignore to avoid TS2307 type resolution
      const url =
        "https://unpkg.com/@mlc-ai/web-stable-diffusion@0.1.1/dist/index.esm.js";
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- dynamic remote import is intentionally not type-checked
      const mod: any = await import(/* @vite-ignore */ url);
      const txt2img = mod?.txt2img || (mod as any)["txt2img"];
      if (!txt2img) {
        throw new Error("AI image generator not available.");
      }

      const imageBitmap: ImageBitmap = await txt2img({ prompt, steps: 15 });

      const canvas = document.createElement("canvas");
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imageBitmap, 0, 0);
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
          "image/png"
        )
      );

      onResult(blob, "mlc-web-stable-diffusion@0.1.1");
    } catch (e: any) {
      setErr(e?.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems="center"
      >
        <TextField
          size="small"
          label="Image prompt"
          placeholder="Describe the image to generate"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          fullWidth
        />
        <Button
          size="small"
          variant="outlined"
          onClick={generate}
          disabled={loading || !prompt}
        >
          {loading ? "Generating…" : "AI Generate"}
        </Button>
      </Stack>
      {err && (
        <Typography variant="caption" color="error">
          {err}
        </Typography>
      )}
    </Stack>
  );
}
