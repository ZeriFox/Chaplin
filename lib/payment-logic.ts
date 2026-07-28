export interface PaymentSchedule {
  depositAmount: number // 30%
  balanceAmount: number // 70%
  depositDueDate: Date
  balanceDueDate: Date // 7 giorni prima del check-in
  totalAmount: number
}

export interface CancellationPolicy {
  canCancel: boolean
  refundPercentage: number
  penaltyPercentage: number
  refundAmount: number
  penaltyAmount: number
}

/**
 * Calcola lo schedule di pagamento per una prenotazione
 * 30% alla prenotazione, 70% 7 giorni prima del check-in
 */
export function calculatePaymentSchedule(
  totalAmount: number,
  checkInDate: Date,
  bookingDate: Date = new Date(),
): PaymentSchedule {
  const depositPercentage = 0.3
  const balancePercentage = 0.7

  const depositAmount = Math.round(totalAmount * depositPercentage)
  const balanceAmount = totalAmount - depositAmount

  // Balance due 7 days before check-in
  const balanceDueDate = new Date(checkInDate)
  balanceDueDate.setDate(balanceDueDate.getDate() - 7)

  return {
    depositAmount,
    balanceAmount,
    depositDueDate: bookingDate,
    balanceDueDate,
    totalAmount,
  }
}

/**
 * Calcola la policy di cancellazione basata sulla data di check-in
 * - Più di 7 giorni prima del check-in: rimborso 100% (gratis)
 * - 7 giorni o meno prima del check-in: penale 100% (nessun rimborso)
 */
export function calculateCancellationPolicy(
  checkInDate: Date,
  amountPaid: number,
  cancellationDate: Date = new Date(),
): CancellationPolicy {
  const daysUntilCheckIn = Math.floor((checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60 * 24))

  let refundPercentage = 0
  let penaltyPercentage = 100

  if (daysUntilCheckIn > 7) {
    // Più di 7 giorni: rimborso totale
    refundPercentage = 100
    penaltyPercentage = 0
  } else {
    // 7 giorni o meno: penale 100%, nessun rimborso
    refundPercentage = 0
    penaltyPercentage = 100
  }

  const refundAmount = Math.round((amountPaid * refundPercentage) / 100)
  const penaltyAmount = amountPaid - refundAmount

  return {
    canCancel: true,
    refundPercentage,
    penaltyPercentage,
    refundAmount,
    penaltyAmount,
  }
}

/**
 * Calcola la penalità per cambio date
 * - Più di 7 giorni prima del check-in: gratis
 * - 7 giorni o meno prima del check-in: penale 50% dell'importo totale
 */
export function calculateChangeDatesPenaltyFromDate(
  checkInDate: Date,
  amountPaid: number,
  changeDate: Date = new Date(),
): { penalty: number; canChange: boolean; penaltyPercentage: number } {
  const daysUntilCheckIn = Math.floor((checkInDate.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilCheckIn > 7) {
    return { penalty: 0, canChange: true, penaltyPercentage: 0 }
  } else {
    // 7 giorni o meno: penale 50%
    const penalty = Math.round(amountPaid * 0.5)
    return { penalty, canChange: true, penaltyPercentage: 50 }
  }
}
