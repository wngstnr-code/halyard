import { Address, formatUnits, maxUint256, zeroAddress } from 'viem'
import {
  bStockAbi,
  erc20Abi,
  halyardVaultAbi,
  venusComptrollerAbi,
  venusOracleAbi,
  venusVaiControllerAbi,
  venusVTokenAbi,
} from '@/lib/halyard/abis'
import { bscClient } from '@/lib/halyard/client'
import {
  HALYARD_VAULT,
  VENUS_COMPTROLLER,
  VENUS_ORACLE,
  VENUS_VBNB,
  bStockByVToken,
} from '@/lib/halyard/constants'

const COLLATERAL_FACTOR = 0
const LIQUIDATION_THRESHOLD = 1

export type PositionAsset = {
  vToken: Address
  symbol: string
  decimals: number
  isBStock: boolean
  supplied: number
  borrowed: number
  price: number
  suppliedUsd: number
  borrowedUsd: number
  collateralFactor: number
  liquidationThreshold: number
  /** EIP-8056 multiplier from raw to UI units (1 for tokens without one). */
  uiMultiplier: number
}

export type HalyardPolicy = {
  minHealth: number
  targetHealth: number
  weekendHealth: number
  maxSlippage: number
  expiry: number
  sellable: Address[]
}

export type Position = {
  account: Address
  /** LT-weighted collateral over debt, from HalyardVault.health. Infinity when there is no debt. */
  health: number
  weightedUsd: number
  debtUsd: number
  vaiDebtUsd: number
  /** Collateral-factor-weighted collateral: the Venus borrow limit. */
  borrowLimitUsd: number
  bStockWeightedUsd: number
  assets: PositionAsset[]
  policy: HalyardPolicy | null
  delegated: boolean
}

const usd = (value: bigint, decimals = 18) => Number(formatUnits(value, decimals))

export async function fetchPosition(account: Address): Promise<Position> {
  const [healthResult, policy, assetsIn, delegated, vaiController] = await Promise.all([
    bscClient.readContract({
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'health',
      args: [account],
    }),
    bscClient.readContract({
      address: HALYARD_VAULT,
      abi: halyardVaultAbi,
      functionName: 'policyOf',
      args: [account],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'getAssetsIn',
      args: [account],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'approvedDelegates',
      args: [account, HALYARD_VAULT],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'vaiController',
    }),
  ])

  const [healthBps, weighted, debt] = healthResult

  const [assets, vaiDebt] = await Promise.all([
    Promise.all(assetsIn.map(vToken => fetchAsset(account, vToken))),
    vaiController === zeroAddress
      ? Promise.resolve(0n)
      : bscClient.readContract({
          address: vaiController,
          abi: venusVaiControllerAbi,
          functionName: 'getVAIRepayAmount',
          args: [account],
        }),
  ])

  const borrowLimitUsd = assets.reduce((sum, a) => sum + a.suppliedUsd * a.collateralFactor, 0)

  const bStockWeightedUsd = assets
    .filter(a => a.isBStock)
    .reduce((sum, a) => sum + a.suppliedUsd * a.liquidationThreshold, 0)

  return {
    account,
    health: healthBps === maxUint256 ? Infinity : Number(healthBps) / 10_000,
    weightedUsd: usd(weighted),
    debtUsd: usd(debt),
    vaiDebtUsd: usd(vaiDebt),
    borrowLimitUsd,
    bStockWeightedUsd,
    assets: assets.filter(a => a.supplied > 0 || a.borrowed > 0),
    policy:
      policy.sellable.length === 0
        ? null
        : {
            minHealth: policy.minHealthBps / 10_000,
            targetHealth: policy.targetHealthBps / 10_000,
            weekendHealth: policy.weekendHealthBps / 10_000,
            maxSlippage: policy.maxSlippageBps / 10_000,
            expiry: Number(policy.expiry),
            sellable: [...policy.sellable],
          },
    delegated,
  }
}

async function fetchAsset(account: Address, vToken: Address): Promise<PositionAsset> {
  const isNative = vToken.toLowerCase() === VENUS_VBNB.toLowerCase()

  const [snapshot, price, cf, lt, underlying] = await Promise.all([
    bscClient.readContract({
      address: vToken,
      abi: venusVTokenAbi,
      functionName: 'getAccountSnapshot',
      args: [account],
    }),
    bscClient.readContract({
      address: VENUS_ORACLE,
      abi: venusOracleAbi,
      functionName: 'getUnderlyingPrice',
      args: [vToken],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'getEffectiveLtvFactor',
      args: [account, vToken, COLLATERAL_FACTOR],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'getEffectiveLtvFactor',
      args: [account, vToken, LIQUIDATION_THRESHOLD],
    }),
    isNative
      ? Promise.resolve(null)
      : bscClient.readContract({
          address: vToken,
          abi: venusVTokenAbi,
          functionName: 'underlying',
        }),
  ])

  const [symbol, decimals] = underlying
    ? await Promise.all([
        bscClient.readContract({ address: underlying, abi: erc20Abi, functionName: 'symbol' }),
        bscClient.readContract({ address: underlying, abi: erc20Abi, functionName: 'decimals' }),
      ])
    : ['BNB', 18]

  const bStock = bStockByVToken(vToken)
  const uiMultiplier = bStock
    ? await bscClient.readContract({
        address: bStock.token,
        abi: bStockAbi,
        functionName: 'uiMultiplier',
      })
    : 10n ** 18n

  const [, vTokenBalance, borrowBalance, exchangeRate] = snapshot
  const suppliedRaw = (vTokenBalance * exchangeRate) / 10n ** 18n

  return {
    vToken,
    symbol,
    decimals,
    isBStock: Boolean(bStock),
    supplied: Number(formatUnits(suppliedRaw, decimals)),
    borrowed: Number(formatUnits(borrowBalance, decimals)),
    // The Venus oracle scales prices to 36 - decimals, so raw amount * price has 36 decimals.
    price: Number(formatUnits(price, 36 - decimals)),
    suppliedUsd: usd(suppliedRaw * price, 36),
    borrowedUsd: usd(borrowBalance * price, 36),
    collateralFactor: usd(cf),
    liquidationThreshold: usd(lt),
    uiMultiplier: usd(uiMultiplier),
  }
}

/** How far bStock prices can fall, together, before the account can be liquidated. */
export function liquidationDrop(position: Position): number | null {
  if (position.debtUsd === 0 || position.bStockWeightedUsd === 0) return null
  return (position.weightedUsd - position.debtUsd) / position.bStockWeightedUsd
}

/** Extra USDT that can be borrowed while keeping health at `target`, capped by the Venus limit. */
export function headroomAt(position: Position, target: number): number {
  const byHealth = position.weightedUsd / target - position.debtUsd
  const byVenus = position.borrowLimitUsd - position.debtUsd
  return Math.max(0, Math.min(byHealth, byVenus))
}
