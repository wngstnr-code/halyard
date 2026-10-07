'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { BaseError } from 'viem'
import { bsc } from 'viem/chains'
// Halyard pages run on their own BSC-only wagmi config, not the template's UserAccountProvider.
// eslint-disable-next-line no-restricted-imports
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

export type TxState = {
  label: string
  status: 'signing' | 'pending' | 'success' | 'error'
  hash?: `0x${string}`
  error?: string
}

function errorMessage(error: unknown): string {
  if (error instanceof BaseError) return error.shortMessage
  return error instanceof Error ? error.message : 'Transaction failed'
}

/** Sends one contract write on BSC and tracks it until the receipt arrives. */
export function useHalyardTx() {
  const queryClient = useQueryClient()
  const { chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [tx, setTx] = useState<TxState | null>(null)
  const receipt = useWaitForTransactionReceipt({ hash: tx?.hash, chainId: bsc.id })

  useEffect(() => {
    if (!tx?.hash || tx.status !== 'pending') return

    if (receipt.isSuccess) {
      setTx({ ...tx, status: receipt.data.status === 'success' ? 'success' : 'error' })
      queryClient.invalidateQueries({ queryKey: ['halyard'] })
    } else if (receipt.isError) {
      setTx({ ...tx, status: 'error', error: errorMessage(receipt.error) })
    }
  }, [receipt.isSuccess, receipt.isError, receipt.data, receipt.error, tx, queryClient])

  async function send(label: string, request: Parameters<typeof writeContractAsync>[0]) {
    setTx({ label, status: 'signing' })

    try {
      if (chainId !== bsc.id) await switchChainAsync({ chainId: bsc.id })
      const hash = await writeContractAsync({ ...request, chainId: bsc.id })
      setTx({ label, status: 'pending', hash })
    } catch (error) {
      setTx({ label, status: 'error', error: errorMessage(error) })
    }
  }

  const busy = tx?.status === 'signing' || tx?.status === 'pending'
  return { tx, send, busy }
}
