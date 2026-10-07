import { createPublicClient, fallback, http } from 'viem'
import { bsc } from 'viem/chains'
import { BSC_LOGS_RPC_URL, BSC_RPC_URLS } from '@/lib/halyard/constants'

// Read-only clients used by every Halyard page. Wallet writes go through wagmi.
export const bscClient = createPublicClient({
  chain: bsc,
  batch: { multicall: true },
  transport: fallback(BSC_RPC_URLS.map(url => http(url, { timeout: 20_000 }))),
})

export const bscLogsClient = createPublicClient({
  chain: bsc,
  transport: http(BSC_LOGS_RPC_URL, { timeout: 30_000, retryCount: 2 }),
})
