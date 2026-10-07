const usdFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

export function fmtUsd(value: number): string {
  return Math.abs(value) >= 1_000_000 ? usdCompact.format(value) : usdFormat.format(value)
}

export function fmtAmount(value: number): string {
  if (value === 0) return '0'
  if (value < 0.0001) return '<0.0001'
  return value.toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 6 : 4 })
}

export function fmtHealth(value: number): string {
  if (!Number.isFinite(value)) return 'No debt'
  return value.toFixed(2)
}

export function fmtPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function fmtCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / 86_400)
  const hours = Math.floor((s % 86_400) / 3_600)
  const minutes = Math.floor((s % 3_600) / 60)
  const secs = s % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  return `${minutes}m ${secs}s`
}

/** A timestamp in the viewer's local time zone, for example "Fri, Oct 9, 3:00 AM GMT+7". */
export function fmtLocalTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Status colour for a health factor: liquidation at 1.0, Halyard targets start at 1.3. */
export const STATUS_COLORS = { success: '#007E46', warning: '#BB7400', danger: '#CC272E' }

export function healthColor(value: number): string {
  if (!Number.isFinite(value) || value >= 1.5) return STATUS_COLORS.success
  if (value >= 1.3) return STATUS_COLORS.warning
  return STATUS_COLORS.danger
}

/** The trading day of a NYSE timestamp in New York, for example "Fri, Oct 2". */
export function fmtMarketDay(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Raw bStock amount, plus the EIP-8056 UI amount when the token has a corporate-action multiplier. */
export function fmtBStockAmount(raw: number, uiMultiplier: number): string {
  if (Math.abs(uiMultiplier - 1) < 1e-9) return fmtAmount(raw)
  return `${fmtAmount(raw)} (UI ${fmtAmount(raw * uiMultiplier)})`
}
