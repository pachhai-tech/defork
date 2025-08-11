import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography
} from "@mui/material";

const steps = [
  {
    key: "connect",
    title: "Connect your wallet",
    text: "Use MetaMask, Coinbase, or WalletConnect to get started."
  },
  {
    key: "create",
    title: "Create / Mint",
    text: "Write or generate content locally, upload to IPFS, then mint."
  },
  {
    key: "gallery",
    title: "Gallery & Explorer",
    text: "See your NFTs and navigate forks via the Fork Explorer."
  },
  {
    key: "vote",
    title: "What’s next",
    text: "Voting & full economy land in the next phase."
  }
];

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = steps[i];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function next() {
    if (i < steps.length - 1) setI(i + 1);
    else onClose();
  }
  function prev() {
    if (i > 0) setI(i - 1);
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="subtitle2" color="text.secondary">
          {i + 1} / {steps.length}
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {s.title}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1">{s.text}</Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 2, display: "block" }}
        >
          Tip: Use → and ←, or Esc to close.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={prev} disabled={i === 0}>
            Back
          </Button>
          <Button variant="contained" onClick={next}>
            {i === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
