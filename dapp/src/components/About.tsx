import { useAccount, useChainId } from "wagmi";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Paper,
  Box
} from "@mui/material";
import {
  CONTRACT_ADDRESS,
  REGISTRY_ADDRESS,
  VOTING_POOL_ADDRESS,
  ROYALTY_MANAGER_ADDRESS
} from "../config/contract";

export function About({ onClose }: { onClose: () => void }) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();

  const info = {
    version: import.meta.env.VITE_APP_VERSION || "dev",
    commit: import.meta.env.VITE_BUILD_COMMIT || "dev",
    buildTime: import.meta.env.VITE_BUILD_TIME || "unknown",
    env: {
      VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
      VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
      VITE_NFT_ADDRESS: import.meta.env.VITE_NFT_ADDRESS,
      VITE_REGISTRY_ADDRESS: import.meta.env.VITE_REGISTRY_ADDRESS,
      VITE_VOTING_POOL_ADDRESS: import.meta.env.VITE_VOTING_POOL_ADDRESS,
      VITE_ROYALTY_MANAGER_ADDRESS: import.meta.env
        .VITE_ROYALTY_MANAGER_ADDRESS,
      VITE_USDC_ADDRESS: import.meta.env.VITE_USDC_ADDRESS,
      VITE_WETH_ADDRESS: import.meta.env.VITE_WETH_ADDRESS
    },
    runtime: {
      connected: isConnected,
      address,
      chainId
    },
    addresses: {
      nftContract: CONTRACT_ADDRESS,
      registry: REGISTRY_ADDRESS,
      votingPool: VOTING_POOL_ADDRESS,
      royaltyManager: ROYALTY_MANAGER_ADDRESS
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h6" fontWeight={800}>
          About this dApp
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {/* Build/Runtime summary cards */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems="stretch"
        >
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography fontWeight={700}>Build Info</Typography>
            <Stack spacing={0.5} mt={1}>
              <Typography variant="body2">
                Version: <strong>{String(info.version)}</strong>
              </Typography>
              <Typography variant="body2">
                Commit: <strong>{String(info.commit).slice(0, 7)}</strong>
              </Typography>
              <Typography variant="body2">
                Built: <strong>{String(info.buildTime)}</strong>
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography fontWeight={700}>Runtime</Typography>
            <Stack spacing={0.5} mt={1}>
              <Typography variant="body2">
                Connected: <strong>{String(info.runtime.connected)}</strong>
              </Typography>
              <Typography variant="body2">
                Address:{" "}
                <span style={{ fontFamily: "monospace" }}>
                  {String(info.runtime.address || "—")}
                </span>
              </Typography>
              <Typography variant="body2">
                Chain ID: <strong>{String(info.runtime.chainId)}</strong>
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        {/* Addresses */}
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography fontWeight={700}>Contract Addresses</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1,
              mt: 1
            }}
          >
            <div>
              <Typography variant="caption" color="text.secondary">
                NFT Contract:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {info.addresses.nftContract}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="text.secondary">
                Registry:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {info.addresses.registry}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="text.secondary">
                Voting Pool:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {info.addresses.votingPool}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" color="text.secondary">
                Royalty Manager:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                {info.addresses.royaltyManager}
              </Typography>
            </div>
          </Box>
        </Paper>

        {/* Environment snapshot */}
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography fontWeight={700}>Network Configuration</Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              mt: 1,
              bgcolor: "grey.50",
              p: 1,
              borderRadius: 1,
              maxHeight: 260,
              overflow: "auto",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: "0.75rem"
            }}
          >
            {JSON.stringify(info.env, null, 2)}
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
