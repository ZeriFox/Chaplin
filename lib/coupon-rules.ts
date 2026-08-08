export type CouponRule = {
  type: "percentage" | "fixed"
  value: number
  active: boolean
  startsAt?: string | null
  endsAt?: string | null
  minSubtotal?: number
  maxUses?: number | null
  maxUsesPerCustomer?: number | null
  usageCount?: number
}

export class CouponRuleError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "CouponRuleError"
    this.status = status
  }
}

export function validateCouponRule(
  coupon: CouponRule,
  { subtotal, referenceDate, customerUsageCount = 0 }: { subtotal: number; referenceDate: string; customerUsageCount?: number },
) {
  if (!coupon.active) throw new CouponRuleError("Questo coupon non è attivo")
  if (!Number.isFinite(subtotal) || subtotal <= 0) throw new CouponRuleError("Totale prenotazione non valido")
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    throw new CouponRuleError(`Il coupon richiede un importo minimo di €${coupon.minSubtotal.toFixed(2)}`)
  }
  if (coupon.maxUses && Number(coupon.usageCount || 0) >= coupon.maxUses) {
    throw new CouponRuleError("Questo coupon ha raggiunto il numero massimo di utilizzi")
  }
  if (coupon.maxUsesPerCustomer && customerUsageCount >= coupon.maxUsesPerCustomer) {
    throw new CouponRuleError("Hai raggiunto il limite di utilizzi previsto per questo coupon")
  }
  if (coupon.startsAt && referenceDate < coupon.startsAt) throw new CouponRuleError("Questo coupon non è ancora valido")
  if (coupon.endsAt && referenceDate > coupon.endsAt) throw new CouponRuleError("Questo coupon è scaduto")
}

export function calculateCouponDiscount(coupon: Pick<CouponRule, "type" | "value">, subtotal: number) {
  const raw = coupon.type === "percentage" ? subtotal * (coupon.value / 100) : coupon.value
  return Math.min(subtotal, Math.max(0, Math.round(raw * 100) / 100))
}
