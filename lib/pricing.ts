/**
 * Pricing logic based on number of guests
 * Base price: €150 for 2 guests
 *
 * 1 guest: 95% (€143)
 * 2 guests: 100% (€150)
 * 3 guests: 130% (€195)
 * 4 guests: 140% (€210)
 */

const BASE_PRICE = 15000 // €150 in cents

export function calculatePriceByGuests(guests: number, nights = 1): number {
  let multiplier = 1.0

  switch (guests) {
    case 1:
      multiplier = 0.95 // 95%
      break
    case 2:
      multiplier = 1.0 // 100%
      break
    case 3:
      multiplier = 1.3 // 130%
      break
    case 4:
      multiplier = 1.4 // 140%
      break
    default:
      // For more than 4 guests, use 4 guests pricing
      multiplier = 1.4
  }

  return Math.round(BASE_PRICE * multiplier * nights)
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function calculateDaysUntilCheckIn(checkIn: string): number {
  const today = new Date()
  const checkInDate = new Date(checkIn)
  const diffTime = checkInDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Cancellazione:
 * - Più di 7 giorni prima del check-in: nessuna penale (rimborso 100%)
 * - 7 giorni o meno: penale 100% (nessun rimborso)
 */
export function calculateCancellationPenalty(totalAmount: number, daysUntilCheckIn: number): number {
  if (daysUntilCheckIn > 7) {
    return 0
  }
  return totalAmount
}

/**
 * Cambio date:
 * - Più di 7 giorni prima del check-in: gratis
 * - 7 giorni o meno: penale 50% dell'importo totale
 */
export function calculateChangeDatesPenalty(totalAmount: number, daysUntilCheckIn: number): number {
  if (daysUntilCheckIn > 7) {
    return 0
  }
  return Math.round(totalAmount * 0.5)
}
