import { type BStock, BSTOCKS } from '@/lib/halyard/constants'
import { currentOrNextSession, nextGapSession } from '@/lib/halyard/marketClock'

const KLINES_URL = 'https://data-api.binance.vision/api/v3/klines'
const HOUR = 3_600
// Binance lists hourly bStock candles from Jun 11, 2026.
export const GAP_HISTORY_START = Date.UTC(2026, 5, 11) / 1000

type Candles = Map<number, number> // candle close time (unix s) -> close price

async function fetchCandles(symbol: string): Promise<Candles> {
  const candles: Candles = new Map()
  let startTime = GAP_HISTORY_START * 1000
  const now = Date.now()

  while (startTime < now) {
    const url = `${KLINES_URL}?symbol=${symbol}&interval=1h&startTime=${startTime}&limit=1000`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Binance klines ${symbol}: HTTP ${response.status}`)
    const rows = (await response.json()) as [number, string, string, string, string][]
    if (rows.length === 0) break

    for (const [openTime, , , , close] of rows) {
      candles.set(openTime / 1000 + HOUR, Number(close))
    }

    startTime = rows[rows.length - 1]![0] + HOUR * 1000
  }

  return candles
}

/** Close of the last candle that finished at or before `ts`. */
function priceAtOrBefore(candles: Candles, ts: number): number | null {
  const hour = Math.floor(ts / HOUR) * HOUR
  return candles.get(hour) ?? null
}

/** Close of the first candle that finished at or after `ts`. */
function priceAtOrAfter(candles: Candles, ts: number): number | null {
  const hour = Math.ceil(ts / HOUR) * HOUR
  return candles.get(hour) ?? null
}

export type GapEvent = {
  /** The NYSE close before the gap (unix s). */
  close: number
  /** The next NYSE open (unix s). */
  reopen: number
  closedDays: number
  /** Price change per bStock from the close to one hour after the reopen. */
  gaps: Partial<Record<BStock['symbol'], number>>
}

/**
 * Every NYSE close followed by a weekend or holiday since the bStocks listed, with the real
 * move of each bStock across it. The post-open price is the first hourly close at least one hour
 * after the open, because the Venus oracle updates hourly.
 */
export async function fetchGapEvents(): Promise<GapEvent[]> {
  const candles = await Promise.all(BSTOCKS.map(b => fetchCandles(`${b.symbol}USDT`)))
  const now = Date.now() / 1000
  const events: GapEvent[] = []

  let cursor = GAP_HISTORY_START

  for (;;) {
    const session = nextGapSession(cursor)
    const reopen = currentOrNextSession(session.close + 1).open
    const priced = reopen + HOUR
    if (priced > now) break

    const gaps: GapEvent['gaps'] = {}

    BSTOCKS.forEach((b, i) => {
      const before = priceAtOrBefore(candles[i]!, session.close)
      const after = priceAtOrAfter(candles[i]!, priced)
      if (before && after) gaps[b.symbol] = after / before - 1
    })

    if (Object.keys(gaps).length > 0) {
      events.push({ close: session.close, reopen, closedDays: session.closedDays, gaps })
    }

    cursor = session.close + 1
  }

  return events.reverse()
}
