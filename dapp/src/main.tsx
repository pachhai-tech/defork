import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wallet'
import App from './App'
import { ToastProvider } from './context/ToastContext'
import './index.css'

const qc = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <ToastProvider><App /></ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)


/** Plausible (optional, cookie-free) */
(function(){
  const d = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined
  const src = (import.meta.env.VITE_PLAUSIBLE_SCRIPT as string | undefined) || 'https://plausible.io/js/script.js'
  if (!d) return
  const s = document.createElement('script')
  s.defer = true
  s.src = src
  s.setAttribute('data-domain', d)
  document.head.appendChild(s)
})()
