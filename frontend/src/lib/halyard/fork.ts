import { Address, Chain, isAddress } from 'viem'
import { bsc } from 'viem/chains'
import { BSC_LOGS_RPC_URL, BSC_RPC_URLS } from '@/lib/halyard/constants'

/*
  Local testing against an Anvil fork of BSC mainnet:
    NEXT_PUBLIC_FORK_RPC_URL=http://127.0.0.1:8545  sends every read, log scan and write to the fork.
    NEXT_PUBLIC_FORK_ACCOUNT=<address>              connects as that account without a browser wallet
                                                    (Anvil must run with --auto-impersonate).
  Both are ignored unless the URL is on localhost, so a deployed build always talks to mainnet.
*/
const forkUrl = process.env.NEXT_PUBLIC_FORK_RPC_URL
const forkAccount = process.env.NEXT_PUBLIC_FORK_ACCOUNT

export const FORK_RPC_URL =
  forkUrl && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(forkUrl) ? forkUrl : undefined

export const FORK_ACCOUNT: Address | undefined =
  FORK_RPC_URL && forkAccount && isAddress(forkAccount) ? forkAccount : undefined

export const halyardChain: Chain = FORK_RPC_URL
  ? { ...bsc, rpcUrls: { default: { http: [FORK_RPC_URL] } } }
  : bsc

export const READ_RPC_URLS = FORK_RPC_URL ? [FORK_RPC_URL] : BSC_RPC_URLS
export const LOGS_RPC_URL = FORK_RPC_URL ?? BSC_LOGS_RPC_URL
