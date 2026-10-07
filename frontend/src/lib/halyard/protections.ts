import { Address, Hash, formatUnits, getAbiItem } from 'viem'
import { halyardVaultAbi } from '@/lib/halyard/abis'
import { bscLogsClient } from '@/lib/halyard/client'
import {
  HALYARD_FROM_BLOCK,
  HALYARD_VAULT,
  LOGS_BLOCK_RANGE,
  bStockByVToken,
} from '@/lib/halyard/constants'

/** Block ranges from the vault deployment to the latest block, sized for the public RPC. */
export async function logRanges(): Promise<[bigint, bigint][]> {
  const latest = await bscLogsClient.getBlockNumber()
  const ranges: [bigint, bigint][] = []

  for (let from = HALYARD_FROM_BLOCK; from <= latest; from += LOGS_BLOCK_RANGE + 1n) {
    const to = from + LOGS_BLOCK_RANGE > latest ? latest : from + LOGS_BLOCK_RANGE
    ranges.push([from, to])
  }

  return ranges
}

export type ProtectionEvent = {
  txHash: Hash
  blockNumber: bigint
  timestamp: number
  user: Address
  trigger: 'Low health' | 'Pre-close'
  collateral: string
  seized: number
  repaid: number
  healthBefore: number
  healthAfter: number
  fee: number
  tip: number
  keeper: Address
}

const protectedEvent = getAbiItem({ abi: halyardVaultAbi, name: 'Protected' })

/** Every Protected event since the vault was deployed, for one user or all, newest first. */
export async function fetchProtections(user?: Address): Promise<ProtectionEvent[]> {
  const ranges = await logRanges()

  const chunks = await Promise.all(
    ranges.map(([fromBlock, toBlock]) =>
      bscLogsClient.getLogs({
        address: HALYARD_VAULT,
        event: protectedEvent,
        args: user ? { user } : undefined,
        fromBlock,
        toBlock,
      })
    )
  )

  const logs = chunks.flat().reverse()

  const blocks = await Promise.all(
    [...new Set(logs.map(log => log.blockNumber))].map(blockNumber =>
      bscLogsClient.getBlock({ blockNumber })
    )
  )

  const timeOf = new Map(blocks.map(block => [block.number, Number(block.timestamp)]))

  return logs.map(log => {
    const args = log.args

    return {
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: timeOf.get(log.blockNumber) ?? 0,
      user: args.user ?? '0x',
      trigger: args.trigger === 1 ? 'Low health' : 'Pre-close',
      collateral: bStockByVToken(args.vCollateral ?? '')?.symbol ?? 'bStock',
      seized: Number(formatUnits(args.seized ?? 0n, 18)),
      repaid: Number(formatUnits(args.repaid ?? 0n, 18)),
      healthBefore: Number(args.healthBefore ?? 0n) / 10_000,
      healthAfter: Number(args.healthAfter ?? 0n) / 10_000,
      fee: Number(formatUnits(args.fee ?? 0n, 18)),
      tip: Number(formatUnits(args.tip ?? 0n, 18)),
      keeper: args.keeper ?? '0x',
    }
  })
}
