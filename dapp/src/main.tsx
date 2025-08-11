import React from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config/wallet";
import { ToastProvider } from "./lib/toast";
import App from "./App";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("Root element #root not found");

const queryClient = new QueryClient();

createRoot(el).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
