import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Stack,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Dialog,
  DialogTitle,
  DialogContent
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import { ConnectKitButton } from "connectkit";

import { Create } from "./components/Create";
import { Gallery } from "./components/Gallery";
import { Tour } from "./components/Tour";
import { ForkExplorer } from "./components/ForkExplorer";
import { AdminPanel } from "./components/AdminPanel";
import { RoleManager } from "./components/RoleManager";
import { QuickstartChecklist } from "./components/QuickstartChecklist";
import { AuditLog } from "./components/AuditLog";
import { VotingInterface } from "./components/VotingInterface";
import { ForkCreator } from "./components/ForkCreator";
import { ToastShelf } from "./lib/toast";
import { ConnectStorageButton } from "./components/ConnectStorageButton";
import { About } from "./components/About";

export default function App() {
  const [showAbout, setShowAbout] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);
  const [selectedTokenId, setSelectedTokenId] = React.useState<number | null>(
    null
  );
  const [showVoting, setShowVoting] = React.useState(false);
  const [showForkCreator, setShowForkCreator] = React.useState(false);
  const [forkParentId, setForkParentId] = React.useState<number | null>(null);
  const [menuEl, setMenuEl] = React.useState<null | HTMLElement>(null);

  React.useEffect(() => {
    const handleOpenAbout = () => setShowAbout(true);
    const handleStartTour = () => setShowTour(true);
    const handleVoteToken = (e: CustomEvent) => {
      setSelectedTokenId(e.detail.tokenId);
      setShowVoting(true);
    };
    const handleCreateForkEvt = (e: CustomEvent) => {
      setForkParentId(e.detail.parentId);
      setShowForkCreator(true);
    };
    window.addEventListener("open-about", handleOpenAbout);
    window.addEventListener("start-tour", handleStartTour);
    window.addEventListener("vote-token", handleVoteToken as EventListener);
    window.addEventListener(
      "create-fork",
      handleCreateForkEvt as EventListener
    );

    if (!localStorage.getItem("tourSeen")) setShowTour(true);

    return () => {
      window.removeEventListener("open-about", handleOpenAbout);
      window.removeEventListener("start-tour", handleStartTour);
      window.removeEventListener(
        "vote-token",
        handleVoteToken as EventListener
      );
      window.removeEventListener(
        "create-fork",
        handleCreateForkEvt as EventListener
      );
    };
  }, []);

  const handleTokenSelect = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    setShowVoting(true);
  };

  const handleCreateFork = (parentId: number) => {
    setForkParentId(parentId);
    setShowForkCreator(true);
  };

  const handleViewContent = (_tokenId: number) => {
    const gallerySection = document.querySelector("#gallery");
    if (gallerySection) gallerySection.scrollIntoView({ behavior: "smooth" });
  };

  async function resetLocalCache() {
    try {
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
      if ("serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            try {
              await r.unregister();
            } catch {}
          }
        } catch {}
      }
      if (window.caches && caches.keys) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {}
      }
      try {
        const dbs = (indexedDB as any).databases
          ? await (indexedDB as any).databases()
          : [];
        const names = (dbs || []).map((d: any) => d.name).filter(Boolean);
        const known = new Set([
          "transformers-cache",
          "webgpu-cache",
          "webnn-cache",
          "mlc-cache",
          "web-stable-diffusion"
        ]);
        for (const n of names) {
          try {
            indexedDB.deleteDatabase(n);
          } catch {}
        }
        known.forEach((n) => {
          try {
            indexedDB.deleteDatabase(n);
          } catch {}
        });
      } catch {}
      alert("Local app cache cleared. The page will reload.");
      window.location.reload();
    } catch (e: any) {
      alert("Reset failed: " + (e?.message || "unknown error"));
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar color="transparent" position="sticky">
        <Toolbar sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mr: 2 }}>
            Decentralized Creative Forking — MVP
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <ConnectKitButton />
            <ConnectStorageButton />
            <Button color="inherit" onClick={() => setShowTour(true)}>
              Start Tour
            </Button>
            <Button color="inherit" onClick={() => setShowAbout(true)}>
              About
            </Button>
            <Button
              color="inherit"
              component="a"
              href="/docs/index.html"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </Button>
            <IconButton
              color="inherit"
              onClick={(e) => setMenuEl(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={menuEl}
              open={Boolean(menuEl)}
              onClose={() => setMenuEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={() => {
                  setMenuEl(null);
                  void resetLocalCache();
                }}
              >
                Reset cache
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <ToastShelf />

        {/* Responsive layout without MUI Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3
          }}
        >
          {/* Checklist spans full width */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <QuickstartChecklist />
          </Box>

          {/* Create + Gallery */}
          <Paper sx={{ p: 2 }}>
            <Create />
          </Paper>
          <Paper id="gallery" sx={{ p: 2 }}>
            <Gallery />
          </Paper>

          {/* Fork Explorer - full width */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Fork Explorer
              </Typography>
              <ForkExplorer
                onForkSelect={handleTokenSelect}
                onCreateFork={handleCreateFork}
                onViewContent={handleViewContent}
              />
            </Paper>
          </Box>

          {/* Admin - full width */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Admin
              </Typography>
              <Stack spacing={3}>
                <AdminPanel />
                <RoleManager />
                <AuditLog />
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>

      <Dialog
        open={showVoting && !!selectedTokenId}
        onClose={() => setShowVoting(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Typography variant="h6" fontWeight={800}>
            Vote for Content #{selectedTokenId}
          </Typography>
          <IconButton onClick={() => setShowVoting(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTokenId ? (
            <VotingInterface
              tokenId={selectedTokenId}
              onVoteSuccess={() => {
                setShowVoting(false);
                setSelectedTokenId(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showForkCreator}
        onClose={() => setShowForkCreator(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Typography variant="h6" fontWeight={800}>
            Create Fork
          </Typography>
          <IconButton onClick={() => setShowForkCreator(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ForkCreator
            parentTokenId={forkParentId || undefined}
            onSuccess={() => {
              setShowForkCreator(false);
              setForkParentId(null);
              window.location.reload();
            }}
            onClose={() => {
              setShowForkCreator(false);
              setForkParentId(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {showAbout && <About onClose={() => setShowAbout(false)} />}
      {showTour && (
        <Tour
          onClose={() => {
            localStorage.setItem("tourSeen", "1");
            setShowTour(false);
          }}
        />
      )}
    </Box>
  );
}
