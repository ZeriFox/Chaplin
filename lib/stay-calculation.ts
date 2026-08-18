const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MILLISECONDS_PER_DAY = 86_400_000

function utcDay(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return null

  const [year, month, day] = value.split("-").map(Number)
  const timestamp = Date.UTC(year, month - 1, day)
  const normalized = new Date(timestamp).toISOString().slice(0, 10)

  return normalized === value ? timestamp : null
}

/**
 * Counts charged nights using calendar dates: check-in included and check-out
 * excluded. UTC calendar arithmetic keeps the result stable across DST changes.
 */
export function calculateStayNights(checkIn: string | null | undefined, checkOut: string | null | undefined) {
  const start = utcDay(String(checkIn || ""))
  const end = utcDay(String(checkOut || ""))

  if (start === null || end === null || end <= start) return 0
  return (end - start) / MILLISECONDS_PER_DAY
}
