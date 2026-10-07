import { Address, formatUnits, zeroAddress } from 'viem'
import { venusComptrollerAbi, venusOracleAbi } from '@/lib/halyard/abis'
import { bscClient } from '@/lib/halyard/client'
import {
  BStock,
  VENUS_COMPTROLLER,
  VENUS_ORACLE,
  VUSDT,
  bStockByVToken,
} from '@/lib/halyard/constants'
import { GapEvent } from '@/lib/halyard/gaps'
import { simulatePlan } from '@/lib/halyard/plan'
import { Position, PositionAsset } from '@/lib/halyard/position'

// Venus Core Pool: liquidators repay up to 50% of the debt and seize 10% extra collateral.
export const CLOSE_FACTOR = 0.5
export const LIQUIDATION_INCENTIVE = 0.1
// Slippage cap used for simulated Halyard runs (the default policy).
export const SIM_SLIPPAGE = 0.01

export type MarketParams = { price: number; collateralFactor: number; liquidationThreshold: number }

/** Live oracle price and default-pool risk parameters for one bStock market. */
export async function fetchMarketParams(bStock: BStock): Promise<MarketParams> {
  const [price, cf, lt] = await Promise.all([
    bscClient.readContract({
      address: VENUS_ORACLE,
      abi: venusOracleAbi,
      functionName: 'getUnderlyingPrice',
      args: [bStock.vToken],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'getEffectiveLtvFactor',
      args: [zeroAddress, bStock.vToken, 0],
    }),
    bscClient.readContract({
      address: VENUS_COMPTROLLER,
      abi: venusComptrollerAbi,
      functionName: 'getEffectiveLtvFactor',
      args: [zeroAddress, bStock.vToken, 1],
    }),
  ])

  return {
    price: Number(formatUnits(price, 18)),
    collateralFactor: Number(formatUnits(cf, 18)),
    liquidationThreshold: Number(formatUnits(lt, 18)),
  }
}

/** A position the user describes: one bStock as collateral and a USDT loan. */
export function hypotheticalPosition(
  bStock: BStock,
  market: MarketParams,
  collateralUsd: number,
  borrowUsd: number
): Position {
  const collateral: PositionAsset = {
    vToken: bStock.vToken,
    symbol: bStock.symbol,
    decimals: 18,
    isBStock: true,
    supplied: collateralUsd / market.price,
    borrowed: 0,
    price: market.price,
    suppliedUsd: collateralUsd,
    borrowedUsd: 0,
    collateralFactor: market.collateralFactor,
    liquidationThreshold: market.liquidationThreshold,
    uiMultiplier: 1,
  }

  const debt: PositionAsset = {
    vToken: VUSDT,
    symbol: 'USDT',
    decimals: 18,
    isBStock: false,
    supplied: 0,
    borrowed: borrowUsd,
    price: 1,
    suppliedUsd: 0,
    borrowedUsd: borrowUsd,
    collateralFactor: 0,
    liquidationThreshold: 0,
    uiMultiplier: 1,
  }

  const weighted = collateralUsd * market.liquidationThreshold

  return {
    account: zeroAddress,
    health: borrowUsd > 0 ? weighted / borrowUsd : Infinity,
    weightedUsd: weighted,
    debtUsd: borrowUsd,
    vaiDebtUsd: 0,
    borrowLimitUsd: collateralUsd * market.collateralFactor,
    bStockWeightedUsd: weighted,
    assets: [collateral, debt],
    policy: null,
    delegated: false,
  }
}

export type Outcome = {
  health: number
  liquidated: boolean
  /** Estimated liquidation incentive lost, in USD. */
  liquidationLoss: number
}

export type ReplayRow = {
  event: GapEvent
  without: Outcome
  with: Outcome & { feesUsd: number; soldUsd: number; ran: boolean }
}

function heldBStocks(position: Position): Address[] {
  return position.assets.filter(a => a.isBStock && a.supplied > 0).map(a => a.vToken)
}

/** Health after each bStock moves by its gap, other collateral unchanged. */
function applyGaps(
  assets: PositionAsset[],
  weighted: number,
  debt: number,
  gapFor: (asset: PositionAsset) => number
): Outcome {
  const moved = assets.reduce(
    (sum, a) => sum + a.suppliedUsd * a.liquidationThreshold * (a.isBStock ? gapFor(a) : 0),
    0
  )

  const health = debt > 0 ? (weighted + moved) / debt : Infinity
  const liquidated = health < 1

  return {
    health,
    liquidated,
    liquidationLoss: liquidated ? debt * CLOSE_FACTOR * LIQUIDATION_INCENTIVE : 0,
  }
}

/** Replays one gap against today's position, with and without a pre-close Halyard run. */
export function replay(
  position: Position,
  weekendTarget: number,
  gapFor: (asset: PositionAsset) => number
): Omit<ReplayRow, 'event'> {
  const without = applyGaps(position.assets, position.weightedUsd, position.debtUsd, gapFor)

  const plan = simulatePlan(position, heldBStocks(position), SIM_SLIPPAGE, weekendTarget)
  if (!plan) return { without, with: { ...without, feesUsd: 0, soldUsd: 0, ran: false } }

  const assets = position.assets.map(a =>
    a.vToken === plan.vCollateral ? { ...a, suppliedUsd: a.suppliedUsd - plan.sellUsd } : a
  )

  const sold = position.assets.find(a => a.vToken === plan.vCollateral)!
  const weighted = position.weightedUsd - plan.sellUsd * sold.liquidationThreshold
  const debt = position.debtUsd - plan.repayUsdt

  return {
    without,
    with: {
      ...applyGaps(assets, weighted, debt, gapFor),
      feesUsd: plan.feeUsdt + plan.tipUsdt,
      soldUsd: plan.sellUsd,
      ran: true,
    },
  }
}

export function replayEvents(
  position: Position,
  events: GapEvent[],
  weekendTarget: number
): ReplayRow[] {
  return events.map(event => ({
    event,
    ...replay(position, weekendTarget, asset => {
      const symbol = bStockByVToken(asset.vToken)?.symbol
      return (symbol && event.gaps[symbol]) || 0
    }),
  }))
}

export function stress(position: Position, weekendTarget: number, gap: number) {
  return replay(position, weekendTarget, () => gap)
}
