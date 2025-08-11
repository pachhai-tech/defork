import { useToast } from "../lib/toast";
import { useState } from "react";

export function AIImage({
  onResult
}: {
  onResult: (blob: Blob, modelId: string) => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [prompt, setPrompt] = useState(
    "IMF dossier style portrait, cinematic lighting"
  );

  async function run() {
    setLoading(true);
    try {
      toast?.show?.({ message: "Loading image model…", type: "info" });
      const mod = await import(
        /* @vite-ignore */ "https://unpkg.com/@mlc-ai/web-stable-diffusion@0.1.1/dist/index.esm.js"
      );
      const txt2img = mod.txt2img || mod["txt2img"];
      const imageBitmap: ImageBitmap = await txt2img({ prompt, steps: 15 });
      const canvas = document.createElement("canvas");
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imageBitmap, 0, 0);
      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), "image/png")
      );
      onResult(blob, "mlc-sd-webgpu");
    } catch (e) {
      alert(`AI error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        className="w-full border rounded p-2"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        className="px-3 py-1 border rounded"
        onClick={run}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate Image (Local)"}
      </button>
    </div>
  );
}
