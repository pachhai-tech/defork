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

import {
  Box,
  Stack,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Chip
} from "@mui/material";

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

    if (!isText && imageBlob) {
      const safe = await isImageSafe(imageBlob);
      if (!safe) {
        push({ kind: "error", message: "Image flagged by NSFW filter" });
        return;
      }
    }

    try {
      push({
        kind: "info",
        title: "Processing",
        message: "Preparing content..."
      });

      // Upload content + compute hash
      let contentUri = "";
      let contentHash = "";

      if (isText) {
        contentHash = await sha256Text(text);
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
      const royalty = BigInt(Number(royaltyBps) || 0);

      const cType = contentType === "TEXT" ? 0 : 1;
      const kType = contrib === "HUMAN" ? 0 : contrib === "AI" ? 1 : 2;

      push({ kind: "info", title: "Minting", message: "Sending transaction…" });

      const result = await new Promise<`0x${string}`>((resolve, reject) => {
        writeContract(
          {
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: "mint",
            args: [
              address!,
              metadataUri,
              royaltyRecv,
              royalty,
              cType,
              kType,
              modelId || ""
            ]
          },
          {
            onSuccess: (hash) => resolve(hash),
            onError: (error) => reject(error)
          }
        );
      });

      const txHash = result;

      const receipt = await waitForTransactionReceipt(config, { hash: txHash });
      let mintedTokenId: bigint | null = null;

      for (const log of receipt.logs as Log[]) {
        if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase())
          continue;
        try {
          const dec = decodeEventLog({
            abi: ABI,
            data: log.data,
            topics: log.topics,
            eventName: "GenesisCreated"
          });
          if (dec?.eventName === "GenesisCreated") {
            mintedTokenId = dec.args.tokenId as bigint;
            break;
          }
        } catch {}
        try {
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
    <Box component="section">
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Create / Mint
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Title"
          required
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          minRows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Parent Token ID (optional)"
            value={parentTokenId}
            onChange={(e) => setParentTokenId(e.target.value)}
            sx={{ maxWidth: 280 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
              />
            }
            label="Mark hidden (metadata)"
          />
        </Stack>

        <Box
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          sx={{
            border: "2px dashed",
            borderColor: dragOver ? "primary.main" : "divider",
            bgcolor: dragOver ? "primary.50" : "transparent",
            borderRadius: 2,
            p: 2,
            textAlign: "center",
            color: "text.secondary"
          }}
        >
          Drag & drop text or image here, or use the controls below.
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Content Type</InputLabel>
            <Select
              label="Content Type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as any)}
            >
              <MenuItem value="TEXT">TEXT</MenuItem>
              <MenuItem value="IMAGE">IMAGE</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Contribution</InputLabel>
            <Select
              label="Contribution"
              value={contrib}
              onChange={(e) => setContrib(e.target.value as any)}
            >
              <MenuItem value="HUMAN">HUMAN</MenuItem>
              <MenuItem value="AI">AI</MenuItem>
              <MenuItem value="COLLAB">COLLAB</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {contentType === "TEXT" ? (
          <Stack spacing={1.5}>
            <TextField
              label="Your text"
              placeholder="Paste or write your text..."
              fullWidth
              multiline
              minRows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <AIText onResult={onAIText} />
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              flexWrap="wrap"
            >
              <Button variant="outlined" component="label">
                Upload Image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageBlob(e.target.files?.[0] || null)}
                />
              </Button>
              <AIImage onResult={onAIImage} />
            </Stack>
            {imageBlob && (
              <Box
                component="img"
                alt="preview"
                src={URL.createObjectURL(imageBlob)}
                sx={{
                  maxWidth: "100%",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider"
                }}
              />
            )}
          </Stack>
        )}

        <Divider />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Model ID (if AI)"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Royalty (bps, e.g. 500=5%)"
            type="number"
            value={royaltyBps}
            onChange={(e) => setRoyaltyBps(Number(e.target.value))}
            sx={{ width: { xs: "100%", sm: 240 } }}
          />
        </Stack>
        <TextField
          label="Royalty Receiver (0x... or blank for default)"
          value={royaltyReceiver}
          onChange={(e) => setRoyaltyReceiver(e.target.value)}
          fullWidth
        />

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={isPending}
          onClick={mint}
        >
          {isPending ? "Minting…" : "Mint NFT"}
        </Button>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ opacity: 0.75 }}
        >
          <Chip size="small" label="IPFS-backed" />
          <Chip size="small" label="On-chain hash" />
          <Chip size="small" label="Royalties" />
        </Stack>
      </Stack>
    </Box>
  );
}
