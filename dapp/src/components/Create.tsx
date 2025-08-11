import { useAccount, useWriteContract } from "wagmi";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { config } from "../config/wallet";
import { waitForTransactionReceipt } from "@wagmi/core";
import { decodeEventLog, isAddress, zeroAddress, type Log } from "viem";

import { uploadJSON, uploadBlob } from "../lib/ipfs";
import { isImageSafe } from "../lib/nsfw";
import { nowUnix, sha256Blob, sha256Text } from "../lib/utils";
import { useToast } from "../lib/toast";

import { useState, useRef, DragEvent, useEffect } from "react";
import { AIText } from "./AIText";
import { AIImage } from "./AIImage";

export function Create() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { push } = useToast();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [contentType, setContentType] = useState<"TEXT" | "IMAGE">("TEXT");
  const [contrib, setContrib] = useState<"HUMAN" | "AI" | "COLLAB">("HUMAN");
  const [modelId, setModelId] = useState("");
  const [text, setText] = useState("");
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [royaltyReceiver, setRoyaltyReceiver] = useState("");
  const [parentTokenId, setParentTokenId] = useState<string>("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("draftCreateForm");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.parentTokenId) setParentTokenId(String(d.parentTokenId));
        if (d.title) setTitle(String(d.title));
        localStorage.removeItem("draftCreateForm");
      }
    } catch {}
  }, []);

  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function onAIText(t: string, m: string) {
    setText(t);
    setContrib("AI");
    setModelId(m);
  }
  function onAIImage(b: Blob, m: string) {
    setImageBlob(b);
    setContrib("AI");
    setModelId(m);
    setContentType("IMAGE");
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setContentType("IMAGE");
      setImageBlob(file);
    } else if (
      file.type.startsWith("text/") ||
      file.type === "application/json"
    ) {
      setContentType("TEXT");
      file.text().then(setText);
    } else {
      alert("Unsupported file type");
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  async function mint() {
    if (!isConnected) {
      push({ kind: "error", message: "Connect a wallet first" });
      return;
    }
    if (!title) {
      push({ kind: "error", message: "Title is required" });
      return;
    }

    const isText = contentType === "TEXT";
    const content = isText ? text : imageBlob;
    if (!content) {
      push({
        kind: "error",
        message: `${isText ? "Text" : "Image"} content is required`
      });
      return;
    }

    // NSFW check for images
    if (!isText && imageBlob) {
      const safe = await isImageSafe(imageBlob);
      if (!safe) {
        push({
          kind: "error",
          message: "Image flagged by NSFW filter"
        });
        return;
      }
    }

    try {
      push({
        kind: "info",
        title: "Processing",
        message: "Preparing content..."
      });

      // Upload content and compute hash
      let contentUri = "";
      let contentHash = "";

      if (isText) {
        contentHash = await sha256Text(text);
        // For text, we can embed it in metadata or upload separately
        const textBlob = new Blob([text], { type: "text/plain" });
        contentUri = await uploadBlob(textBlob, `content_${Date.now()}.txt`);
      } else {
        contentHash = await sha256Blob(imageBlob!);
        contentUri = await uploadBlob(imageBlob!, `image_${Date.now()}.png`);
      }

      // Build metadata
      const meta = {
        name: title,
        description: desc || (isText ? text.slice(0, 200) + "..." : ""),
        image: !isText ? contentUri : undefined,
        contentURI: isText ? contentUri : undefined,
        contentType: isText ? "text/plain" : "image/png",
        contributionType: contrib.toLowerCase(),
        model: modelId ? { id: modelId, version: "1.0" } : null,
        contentHash,
        parentTokenId: parentTokenId ? Number(parentTokenId) : undefined,
        hidden: !!hidden,
        timestamp: nowUnix()
      };

      push({
        kind: "info",
        title: "Uploading",
        message: "Uploading metadata to IPFS…"
      });
      const metadataUri = await uploadJSON(meta);

      const royaltyRecv = isAddress(royaltyReceiver)
        ? royaltyReceiver
        : zeroAddress;
      const royalty = BigInt(Number(royaltyBps) || 0); // Convert to BigInt

      const cType = contentType === "TEXT" ? 0 : 1; // StoryForkNFT.ContentType
      const kType = contrib === "HUMAN" ? 0 : contrib === "AI" ? 1 : 2; // StoryForkNFT.ContributionType

      // ----- Send tx -----
      push({ kind: "info", title: "Minting", message: "Sending transaction…" });

      const result = await new Promise<`0x${string}`>((resolve, reject) => {
        writeContract(
          {
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: "mint",
            args: [
              address!, // to
              metadataUri, // tokenURI (ipfs://...)
              royaltyRecv, // royaltyReceiver (0 = use default)
              royalty, // royaltyBps as BigInt
              cType,
              kType,
              modelId || "" // model id ("" if human)
            ]
          },
          {
            onSuccess: (hash) => resolve(hash),
            onError: (error) => reject(error)
          }
        );
      });

      const txHash = result;

      // Wait for receipt and extract tokenId from events
      const receipt = await waitForTransactionReceipt(config, { hash: txHash });
      let mintedTokenId: bigint | null = null;

      for (const log of receipt.logs as Log[]) {
        if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase())
          continue;
        try {
          // Prefer project event
          const dec = decodeEventLog({
            abi: ABI,
            data: log.data,
            topics: log.topics,
            // Try specific event first; if it fails, catch and try Transfer below.
            eventName: "GenesisCreated"
          });
          if (dec?.eventName === "GenesisCreated") {
            mintedTokenId = dec.args.tokenId as bigint;
            break;
          }
        } catch {}
        try {
          // Fallback to ERC-721 Transfer(from=0x0,to=address,tokenId)
          const dec = decodeEventLog({
            abi: ABI,
            data: log.data,
            topics: log.topics,
            eventName: "Transfer"
          });
          if (
            dec?.eventName === "Transfer" &&
            (dec.args?.from as string)?.toLowerCase() ===
              "0x0000000000000000000000000000000000000000"
          ) {
            mintedTokenId = dec.args.tokenId as bigint;
            break;
          }
        } catch {}
      }

      // Save a little breadcrumb for Gallery (optional)
      try {
        const chainId = Number(import.meta.env.VITE_CHAIN_ID);
        const arr = JSON.parse(localStorage.getItem("mintTxs") || "[]");
        arr.push({
          tokenId: mintedTokenId ? Number(mintedTokenId) : null,
          hash: txHash,
          chainId
        });
        localStorage.setItem("mintTxs", JSON.stringify(arr));
      } catch (e) {
        console.warn("tx save error", e);
      }

      push({
        kind: "success",
        title: "Minted",
        message: `NFT #${mintedTokenId} created successfully!`
      });

      // Reset form
      setTitle("");
      setDesc("");
      setText("");
      setImageBlob(null);
      setParentTokenId("");
      setHidden(false);
      setModelId("");
      setRoyaltyReceiver("");
      setRoyaltyBps(500);
    } catch (e: any) {
      push({
        kind: "error",
        title: "Mint Failed",
        message: e?.message || "Transaction failed"
      });
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-lg">Create / Mint</h2>
      <div className="space-y-3">
        <input
          className="border rounded p-2 w-full"
          placeholder="Title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border rounded p-2 w-full"
          rows={3}
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="flex gap-3 flex-wrap">
          <input
            className="border rounded p-2"
            placeholder="Parent Token ID (optional)"
            value={parentTokenId}
            onChange={(e) => setParentTokenId(e.target.value)}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
            Mark hidden (metadata)
          </label>
        </div>

        <div
          ref={dropRef}
          className="border-2 border-dashed rounded p-4 text-center"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          style={{ background: dragOver ? "#f0f9ff" : "transparent" }}
        >
          Drag & drop text or image here, or use the controls below.
        </div>

        <div className="flex gap-2 items-center">
          <label>Content Type:</label>
          <select
            className="border p-1 rounded"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as any)}
          >
            <option>TEXT</option>
            <option>IMAGE</option>
          </select>
          <label>Contribution:</label>
          <select
            className="border p-1 rounded"
            value={contrib}
            onChange={(e) => setContrib(e.target.value as any)}
          >
            <option>HUMAN</option>
            <option>AI</option>
            <option>COLLAB</option>
          </select>
        </div>

        {contentType === "TEXT" ? (
          <>
            <textarea
              className="border rounded p-2 w-full"
              rows={8}
              placeholder="Paste or write your text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <AIText onResult={onAIText} />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageBlob(e.target.files?.[0] || null)}
              />
              <AIImage onResult={onAIImage} />
            </div>
            {imageBlob && (
              <img
                alt="preview"
                className="max-w-full rounded border"
                src={URL.createObjectURL(imageBlob)}
              />
            )}
          </>
        )}

        <div className="flex gap-2 items-center">
          <input
            className="border rounded p-2 w-[60%]"
            placeholder="Model ID (if AI)"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
          />
          <input
            className="border rounded p-2 w-[40%]"
            placeholder="Royalty (bps, e.g. 500=5%)"
            value={royaltyBps}
            onChange={(e) => setRoyaltyBps(Number(e.target.value))}
          />
        </div>
        <input
          className="border rounded p-2 w-full"
          placeholder="Royalty Receiver (0x... or blank for default)"
          value={royaltyReceiver}
          onChange={(e) => setRoyaltyReceiver(e.target.value)}
        />

        <button
          className="px-4 py-2 border rounded font-medium w-full"
          disabled={isPending}
          onClick={mint}
        >
          {isPending ? "Minting…" : "Mint NFT"}
        </button>
      </div>
    </section>
  );
}
