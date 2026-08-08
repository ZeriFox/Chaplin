export const ACTIVE_BOOKING_STATUSES = new Set(["pending", "confirmed", "paid"])

export class BookingConflictError extends Error {
  status: number

  constructor(message = "La suite non è disponibile nelle date selezionate", status = 409) {
    super(message)
    this.name = "BookingConflictError"
    this.status = status
  }
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function enumerateStayDates(checkIn: string, checkOut: string, maxNights = 366) {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || checkOut <= checkIn) {
    throw new BookingConflictError("Intervallo di date non valido", 400)
  }

  const dates: string[] = []
  const end = new Date(`${checkOut}T12:00:00Z`)
  for (const current = new Date(`${checkIn}T12:00:00Z`); current < end; current.setUTCDate(current.getUTCDate() + 1)) {
    dates.push(current.toISOString().slice(0, 10))
    if (dates.length > maxNights) {
      throw new BookingConflictError(`Il soggiorno non può superare ${maxNights} notti`, 400)
    }
  }
  return dates
}

export function dateRangesOverlap(checkIn: string, checkOut: string, otherCheckIn: string, otherCheckOut: string) {
  return checkIn < otherCheckOut && checkOut > otherCheckIn
}

export function isActiveBookingStatus(status: unknown) {
  return ACTIVE_BOOKING_STATUSES.has(String(status || ""))
}
