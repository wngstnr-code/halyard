/*
  TypeScript port of contracts/src/MarketClock.sol. The contract is the source of truth for
  when Halyard may act; this port only finds the next open and close for countdowns.
  Times are unix seconds.
*/

const DAY = 86_400
const HOUR = 3_600
const PRE_CLOSE_WINDOW = HOUR
const OPEN = 9 * HOUR + 30 * 60
const REGULAR_CLOSE = 16 * HOUR
const EARLY_CLOSE = 13 * HOUR
const EST_OFFSET = 5 * HOUR
const EDT_OFFSET = 4 * HOUR

const HOLIDAYS = new Set([
  20260101, 20260119, 20260216, 20260403, 20260525, 20260619, 20260703, 20260907, 20261126,
  20261225, 20270101, 20270118, 20270215, 20270326, 20270531, 20270618, 20270705, 20270906,
  20271125, 20271224,
])

const EARLY_CLOSES = new Set([20261127, 20261224, 20271126])

function civilFromDays(day: number): [number, number, number] {
  const z = day + 719468
  const era = Math.floor(z / 146097)
  const dayOfEra = z - era * 146097

  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365
  )

  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))

  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153)
  const dayOfMonth = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0)
  return [year, month, dayOfMonth]
}

function daysFromCivil(year: number, month: number, dayOfMonth: number): number {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yearOfEra = y - era * 400
  const shiftedMonth = month > 2 ? month - 3 : month + 9
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + dayOfMonth - 1

  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear

  return era * 146097 + dayOfEra - 719468
}

function ymd(day: number): number {
  const [year, month, dayOfMonth] = civilFromDays(day)
  return year * 10000 + month * 100 + dayOfMonth
}

function firstSunday(year: number, month: number): number {
  const first = daysFromCivil(year, month, 1)
  return first + ((7 - ((first + 4) % 7)) % 7)
}

function isDst(ts: number): boolean {
  const [year] = civilFromDays(Math.floor(ts / DAY))
  const start = (firstSunday(year, 3) + 7) * DAY + 2 * HOUR + EST_OFFSET
  const end = firstSunday(year, 11) * DAY + 2 * HOUR + EDT_OFFSET
  return ts >= start && ts < end
}

function toEastern(ts: number): number {
  return ts - (isDst(ts) ? EDT_OFFSET : EST_OFFSET)
}

/** Eastern wall-clock seconds to a UTC timestamp. */
function fromEastern(local: number): number {
  const asEdt = local + EDT_OFFSET
  return isDst(asEdt) ? asEdt : local + EST_OFFSET
}

/** @param day Days since 1970-01-01 in Eastern wall-clock time. */
export function isTradingDay(day: number): boolean {
  const weekday = (day + 4) % 7
  if (weekday === 0 || weekday === 6) return false
  return !HOLIDAYS.has(ymd(day))
}

function closeTime(day: number): number {
  return EARLY_CLOSES.has(ymd(day)) ? EARLY_CLOSE : REGULAR_CLOSE
}

export function isOpen(ts: number): boolean {
  const local = toEastern(ts)
  const day = Math.floor(local / DAY)
  if (!isTradingDay(day)) return false
  const second = local % DAY
  return second >= OPEN && second < closeTime(day)
}

export function inPreCloseWindow(ts: number): boolean {
  const local = toEastern(ts)
  const day = Math.floor(local / DAY)
  if (!isTradingDay(day) || isTradingDay(day + 1)) return false
  const second = local % DAY
  const close = closeTime(day)
  return second >= close - PRE_CLOSE_WINDOW && second < close
}

export type Session = {
  open: number
  close: number
  /** The close is followed by at least one full closed day, so Halyard's pre-close window applies. */
  gapAfter: boolean
  /** Number of calendar days until the next session opens after this close. */
  closedDays: number
}

/** The session running at `ts`, or the next one to open. */
export function currentOrNextSession(ts: number): Session {
  let day = Math.floor(toEastern(ts) / DAY)

  for (let i = 0; i < 15; i++, day++) {
    if (!isTradingDay(day)) continue
    const close = fromEastern(day * DAY + closeTime(day))
    if (close <= ts) continue
    let next = day + 1
    while (!isTradingDay(next)) next++
    return {
      open: fromEastern(day * DAY + OPEN),
      close,
      gapAfter: next - day > 1,
      closedDays: next - day - 1,
    }
  }

  throw new Error('No NYSE session found in the next two weeks')
}

export const PRE_CLOSE_SECONDS = PRE_CLOSE_WINDOW

/** The next session close that is followed by a weekend or a holiday. */
export function nextGapSession(ts: number): Session {
  let cursor = ts

  for (let i = 0; i < 10; i++) {
    const session = currentOrNextSession(cursor)
    if (session.gapAfter) return session
    cursor = session.close + 1
  }

  throw new Error('No NYSE weekend close found in the next two weeks')
}
