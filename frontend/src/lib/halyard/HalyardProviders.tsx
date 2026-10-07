'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, connectorsForWallets, lightTheme } from '@rainbow-me/rainbowkit'
import {
  binanceWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { fallback, http } from 'viem'
import { WagmiProvider, createConfig } from 'wagmi'
import { injected, mock } from 'wagmi/connectors'
import { FORK_ACCOUNT, READ_RPC_URLS, halyardChain } from '@/lib/halyard/fork'

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? ''

/*
  RainbowKit's wallet list needs a WalletConnect project id. Without one, fall back to the plain
  injected connector: wagmi still discovers every installed browser wallet through EIP-6963.
*/
function createConnectors() {
  if (typeof window === 'undefined') return []
  // Local fork testing only, see fork.ts.
  if (FORK_ACCOUNT) return [mock({ accounts: [FORK_ACCOUNT], features: { defaultConnected: true, reconnect: true } })]
  if (!projectId) return [injected()]

  return connectorsForWallets(
    [
      {
        groupName: 'Wallets',
        wallets: [
          metaMaskWallet,
          binanceWallet,
          trustWallet,
          okxWallet,
          rabbyWallet,
          injectedWallet,
          walletConnectWallet,
        ],
      },
    ],
    { appName: 'Halyard', projectId }
  )
}

function createHalyardWagmiConfig() {
  const connectors = createConnectors()

  return createConfig({
    chains: [halyardChain],
    connectors,
    // On a local fork, never pick up a real browser wallet: it would sign on mainnet.
    multiInjectedProviderDiscovery: !FORK_ACCOUNT,
    ssr: true,
    transports: {
      [halyardChain.id]: fallback(READ_RPC_URLS.map(url => http(url))),
    },
  })
}

const rainbowTheme = lightTheme({
  accentColor: '#0F3562',
  accentColorForeground: '#F6F9FC',
  borderRadius: 'medium',
  fontStack: 'system',
})

// BSC-only web3 stack: wagmi and RainbowKit on BNB Chain, reading through public RPCs only.
export function HalyardProviders({ children }: { children: ReactNode }) {
  const [wagmiConfig] = useState(createHalyardWagmiConfig)

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 2 } },
      })
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={halyardChain} modalSize="compact" theme={rainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
