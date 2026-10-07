import { Address } from 'viem'
import { VUSDT } from '@/lib/halyard/constants'
import { Position } from '@/lib/halyard/position'

// Constants from HalyardVault.sol.
export const FEE = 0.003
export const TIP = 0.001
export const MIN_REPAY_USDT = 10

export const POLICY_LIMITS = {
  minHealth: { min: 1.01, max: 2.99 },
  targetHealth: { min: 1.3, max: 3 },
  weekendHealth: { min: 1.3, max: 3 },
  maxSlippage: { min: 0.005, max: 0.03 },
  maxSellable: 3,
}

export type PolicyDraft = {
  minHealth: number
  targetHealth: number
  weekendHealth: number
  maxSlippage: number
  expiryDays: number
  sellable: Address[]
}

/** Mirrors HalyardVault._validate. Returns a message per invalid field. */
export function validatePolicy(draft: PolicyDraft): Partial<Record<keyof PolicyDraft, string>> {
  const errors: Partial<Record<keyof PolicyDraft, string>> = {}
  const { minHealth, targetHealth, weekendHealth, maxSlippage } = draft
  if (!(minHealth >= POLICY_LIMITS.minHealth.min)) errors.minHealth = 'Must be at least 1.01'

  if (!(targetHealth > minHealth)) errors.targetHealth = 'Must be above the trigger'
  else if (!(targetHealth >= 1.3 && targetHealth <= 3)) {
    errors.targetHealth = 'Between 1.30 and 3.00'
  }

  if (!(weekendHealth >= 1.3 && weekendHealth <= 3)) errors.weekendHealth = 'Between 1.30 and 3.00'
  if (!(maxSlippage >= 0.005 && maxSlippage <= 0.03)) errors.maxSlippage = 'Between 0.5% and 3%'
  if (draft.sellable.length === 0) errors.sellable = 'Pick at least one bStock'
  if (draft.sellable.length > POLICY_LIMITS.maxSellable) errors.sellable = 'At most three'
  if (!(draft.expiryDays > 0)) errors.expiryDays = 'Pick a duration'
  return errors
}

export type SimulatedPlan = {
  /** Health the plan starts from. */
  fromHealth: number
  targetHealth: number
  vCollateral: Address
  symbol: string
  uiMultiplier: number
  /** Tokens redeemed and sold, in raw units. */
  seize: number
  sellUsd: number
  repayUsdt: number
  feeUsdt: number
  tipUsdt: number
  /** Health after the run, at oracle prices. */
  afterHealth: number
}

/**
 * Port of HalyardVault._chooseCollateral at oracle prices. `bStockDrop` scales every bStock
 * price down by that fraction first, to preview a run at a lower health.
 */
export function simulatePlan(
  position: Position,
  sellable: Address[],
  maxSlippage: number,
  targetHealth: number,
  bStockDrop = 0
): SimulatedPlan | null {
  const scale = (isBStock: boolean) => (isBStock ? 1 - bStockDrop : 1)
  const weighted = position.weightedUsd - position.bStockWeightedUsd * bStockDrop
  const debt = position.debtUsd
  if (debt === 0 || weighted >= targetHealth * debt) return null

  const haircut = maxSlippage + FEE + TIP

  const usdtDebt =
    position.assets.find(a => a.vToken.toLowerCase() === VUSDT.toLowerCase())?.borrowedUsd ?? 0

  let best: { asset: (typeof position.assets)[number]; repay: number; sell: number } | null = null

  for (const vToken of sellable) {
    const asset = position.assets.find(a => a.vToken.toLowerCase() === vToken.toLowerCase())
    if (!asset || asset.supplied === 0) continue

    const available = asset.suppliedUsd * scale(asset.isBStock)
    const lk = asset.liquidationThreshold / (1 - haircut)
    if (lk >= targetHealth) continue

    let repay = (targetHealth * debt - weighted) / (targetHealth - lk)
    if (repay > usdtDebt) repay = usdtDebt
    let sell = repay / (1 - haircut)

    if (sell > available) {
      sell = available
      repay = sell * (1 - haircut)
    }

    if (!best || repay > best.repay) best = { asset, repay, sell }
    if (sell < available) break
  }

  if (!best || best.repay < MIN_REPAY_USDT) return null

  const { asset, repay, sell } = best
  const price = asset.price * scale(asset.isBStock)
  const lostWeighted = sell * asset.liquidationThreshold

  return {
    fromHealth: weighted / debt,
    targetHealth,
    vCollateral: asset.vToken,
    symbol: asset.symbol,
    uiMultiplier: asset.uiMultiplier,
    seize: sell / price,
    sellUsd: sell,
    repayUsdt: repay,
    feeUsdt: sell * FEE,
    tipUsdt: sell * TIP,
    afterHealth: (weighted - lostWeighted) / (debt - repay),
  }
}

/** The uniform bStock price drop that brings health down to `health`. */
export function dropToHealth(position: Position, health: number): number | null {
  if (position.debtUsd === 0 || position.bStockWeightedUsd === 0) return null
  const drop = (position.weightedUsd - health * position.debtUsd) / position.bStockWeightedUsd
  return drop > 0 && drop < 1 ? drop : null
}
