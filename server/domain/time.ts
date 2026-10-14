export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (total: number): string => {
  const t = ((Math.round(total) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export const hhmm = (h: string | number, m: string | number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(at)
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUtc - Math.floor(at.getTime() / 1000) * 1000
}

/** Wall-clock time in an IANA zone -> UTC instant (DST-safe). */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const first = tzOffsetMs(new Date(guess), timeZone)
  let ts = guess - first
  const second = tzOffsetMs(new Date(ts), timeZone)
  if (second !== first) ts = guess - second
  return new Date(ts)
}

/** Start/end instants; an end <= start means "after midnight". */
export function shiftInstants(date: string, start: string, end: string, timeZone: string) {
  const s = zonedToUtc(date, start, timeZone)
  const endDate = toMinutes(end) <= toMinutes(start) ? addDaysIso(date, 1) : date
  return { start: s, end: zonedToUtc(endDate, end, timeZone) }
}
