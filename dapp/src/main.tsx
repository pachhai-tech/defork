import React from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { config } from "./config/wallet";
import { ToastProvider } from "./lib/toast";
import { theme } from "./theme";
import App from "./App";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("Root element #root not found");

const queryClient = new QueryClient();

createRoot(el).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
