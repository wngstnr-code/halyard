import { Address, formatUnits, getAbiItem, maxUint256 } from 'viem'
import { halyardVaultAbi, venusComptrollerAbi } from '@/lib/halyard/abis'
import { bscClient, bscLogsClient } from '@/lib/halyard/client'
import { HALYARD_VAULT, VENUS_COMPTROLLER, bStockByVToken } from '@/lib/halyard/constants'
import { logRanges } from '@/lib/halyard/protections'

export type KeeperStatus = 'Ready' | 'Waiting' | 'Expired' | 'No delegation'

export type KeeperRow = {
  account: Address
  health: number
  minHealth: number
  targetHealth: number
  weekendHealth: number
  expiry: number
  status: KeeperStatus
  plan: {
    trigger: 'Low health' | 'Pre-close'
    collateral: string
    repayUsdt: number
    seize: number
    tipUsdt: number
  } | null
}

const policySetEvent = getAbiItem({ abi: halyardVaultAbi, name: 'PolicySet' })

/** Every account that ever called setPolicy, from the vault's events. */
async function fetchPolicyAccounts(): Promise<Address[]> {
  const ranges = await logRanges()

  const chunks = await Promise.all(
    ranges.map(([fromBlock, toBlock]) =>
      bscLogsClient.getLogs({ address: HALYARD_VAULT, event: policySetEvent, fromBlock, toBlock })
    )
  )

  const accounts = chunks.flat().flatMap(log => (log.args.user ? [log.args.user] : []))
  return [...new Set(accounts.map(a => a.toLowerCase()))] as Address[]
}

async function fetchRow(account: Address, now: number): Promise<KeeperRow | null> {
  const [policy, delegated, health, plan] = await Promise.all([
    bscClient.readContract({
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'policyOf',
      args: [account],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'approvedDelegates',
      args: [account, HALYARD_VAULT],
    }),
    bscClient.readContract({
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'health',
      args: [account],
    }),
    bscClient.readContract({
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'canProtect',
      args: [account],
    }),
  ])

  // Cleared policies have no sellable markets left.
  if (policy.sellable.length === 0) return null

  const expiry = Number(policy.expiry)
  const ready = plan.trigger !== 0

  const status: KeeperStatus =
    expiry <= now ? 'Expired' : !delegated ? 'No delegation' : ready ? 'Ready' : 'Waiting'

  return {
    account,
    health: health[0] === maxUint256 ? Infinity : Number(health[0]) / 10_000,
    minHealth: policy.minHealthBps / 10_000,
    targetHealth: policy.targetHealthBps / 10_000,
    weekendHealth: policy.weekendHealthBps / 10_000,
    expiry,
    status,
    plan: ready
      ? {
          trigger: plan.trigger === 1 ? 'Low health' : 'Pre-close',
          collateral: bStockByVToken(plan.vCollateral)?.symbol ?? 'bStock',
          repayUsdt: Number(formatUnits(plan.repay, 18)),
          seize: Number(formatUnits(plan.seize, 18)),
          tipUsdt: Number(formatUnits(plan.tip, 18)),
        }
      : null,
  }
}

const ORDER: Record<KeeperStatus, number> = { Ready: 0, Waiting: 1, 'No delegation': 2, Expired: 3 }

/** Live state of every account with a Halyard policy, ready ones first. */
export async function fetchKeeperRows(): Promise<KeeperRow[]> {
  const accounts = await fetchPolicyAccounts()
  const now = Math.floor(Date.now() / 1000)
  const rows = await Promise.all(accounts.map(account => fetchRow(account, now)))

  return rows
    .filter((row): row is KeeperRow => row !== null)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.health - b.health)
}
