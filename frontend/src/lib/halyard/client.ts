import { createPublicClient, fallback, http } from 'viem'
import { LOGS_RPC_URL, READ_RPC_URLS, halyardChain } from '@/lib/halyard/fork'

// Read-only clients used by every Halyard page. Wallet writes go through wagmi.
export const bscClient = createPublicClient({
  chain: halyardChain,
  batch: { multicall: true },
  transport: fallback(READ_RPC_URLS.map(url => http(url, { timeout: 20_000 }))),
})

export const bscLogsClient = createPublicClient({
  chain: halyardChain,
  transport: http(LOGS_RPC_URL, { timeout: 30_000, retryCount: 2 }),
})
