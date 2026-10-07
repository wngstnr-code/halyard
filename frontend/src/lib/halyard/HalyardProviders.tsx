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
import { bsc } from 'viem/chains'
import { WagmiProvider, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { BSC_RPC_URLS } from '@/lib/halyard/constants'

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID ?? ''

/*
  RainbowKit's wallet list needs a WalletConnect project id. Without one, fall back to the plain
  injected connector: wagmi still discovers every installed browser wallet through EIP-6963.
*/
function createConnectors() {
  if (typeof window === 'undefined') return []
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
    chains: [bsc],
    connectors,
    ssr: true,
    transports: {
      [bsc.id]: fallback(BSC_RPC_URLS.map(url => http(url))),
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
        <RainbowKitProvider initialChain={bsc} modalSize="compact" theme={rainbowTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
