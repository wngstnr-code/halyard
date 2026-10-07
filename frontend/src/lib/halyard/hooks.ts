'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Address, formatUnits, parseUnits } from 'viem'
import { halyardVaultAbi, pancakeQuoterV2Abi } from '@/lib/halyard/abis'
import { bscClient } from '@/lib/halyard/client'
import {
  BSTOCK_POOL_FEE,
  BStock,
  HALYARD_VAULT,
  PANCAKE_QUOTER_V2,
  USDT,
} from '@/lib/halyard/constants'
import { fetchGapEvents } from '@/lib/halyard/gaps'
import { fetchKeeperRows } from '@/lib/halyard/keeper'
import { fetchMarketParams } from '@/lib/halyard/simulate'
import { fetchPosition } from '@/lib/halyard/position'
import { fetchProtections } from '@/lib/halyard/protections'

export function usePosition(account: Address | undefined) {
  return useQuery({
    queryKey: ['halyard', 'position', account],
    queryFn: () => fetchPosition(account!),
    enabled: Boolean(account),
    refetchInterval: 30_000,
  })
}

export function useProtections(account: Address | undefined) {
  return useQuery({
    queryKey: ['halyard', 'protections', account],
    queryFn: () => fetchProtections(account!),
    enabled: Boolean(account),
    staleTime: 60_000,
  })
}

/** Open and pre-close flags exactly as HalyardVault sees them in the latest block. */
export function useOnChainMarketState() {
  return useQuery({
    queryKey: ['halyard', 'marketState'],
    queryFn: async () => {
      const [open, preCloseWindow] = await bscClient.readContract({
        address: HALYARD_VAULT,
        abi: halyardVaultAbi,
        functionName: 'marketState',
      })

      return { open, preCloseWindow }
    },
    refetchInterval: 60_000,
  })
}

/** Current unix time in seconds, updated every second. */
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  return now
}

/** What `protect(user)` would do in the current block, straight from HalyardVault.canProtect. */
export function useCanProtect(account: Address | undefined) {
  return useQuery({
    queryKey: ['halyard', 'canProtect', account],
    queryFn: async () => {
      const plan = await bscClient.readContract({
        address: HALYARD_VAULT,
        abi: halyardVaultAbi,
        functionName: 'canProtect',
        args: [account!],
      })

      return {
        trigger: plan.trigger === 1 ? 'Low health' : plan.trigger === 2 ? 'Pre-close' : null,
        vCollateral: plan.vCollateral,
        repayUsdt: Number(formatUnits(plan.repay, 18)),
        seize: Number(formatUnits(plan.seize, 18)),
      }
    },
    enabled: Boolean(account),
    refetchInterval: 30_000,
  })
}

/** USDT that PancakeSwap v3 pays right now for `amount` of a bStock, from QuoterV2. */
export function useSwapQuote(token: Address | undefined, amount: number | undefined) {
  return useQuery({
    queryKey: ['halyard', 'quote', token, amount],
    queryFn: async () => {
      const amountIn = parseUnits(amount!.toFixed(18), 18)

      const { result } = await bscClient.simulateContract({
        address: PANCAKE_QUOTER_V2,
        abi: pancakeQuoterV2Abi,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: token!,
            tokenOut: USDT,
            amountIn,
            fee: BSTOCK_POOL_FEE,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })

      return Number(formatUnits(result[0], 18))
    },
    enabled: Boolean(token) && Boolean(amount && amount > 0),
    staleTime: 30_000,
  })
}

/** Real weekend and holiday gaps for every bStock since listing, from Binance hourly candles. */
export function useGapEvents() {
  return useQuery({
    queryKey: ['halyard', 'gapEvents'],
    queryFn: fetchGapEvents,
    staleTime: 60 * 60_000,
  })
}

export function useMarketParams(bStock: BStock) {
  return useQuery({
    queryKey: ['halyard', 'market', bStock.vToken],
    queryFn: () => fetchMarketParams(bStock),
    staleTime: 60_000,
  })
}

/** Every account with a Halyard policy and what protect would do for it now. */
export function useKeeperRows(watch: boolean) {
  return useQuery({
    queryKey: ['halyard', 'keeperRows'],
    queryFn: fetchKeeperRows,
    refetchInterval: watch ? 60_000 : false,
  })
}

/** Every Protected event from every account. */
export function useAllProtections() {
  return useQuery({
    queryKey: ['halyard', 'protections', 'all'],
    queryFn: () => fetchProtections(),
    staleTime: 60_000,
  })
}
