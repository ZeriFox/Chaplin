import "server-only"

import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"

export type CouponType = "percentage" | "fixed"

export type CouponRecord = {
  code: string
  description?: string
  type: CouponType
  value: number
  active: boolean
  startsAt?: string | null
  endsAt?: string | null
  minSubtotal?: number
  maxUses?: number | null
  usageCount?: number
}

export class CouponError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "CouponError"
    this.status = status
  }
}

export function normalizeCouponCode(value: unknown) {
  const code = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40)

  if (code.length < 3) throw new CouponError("Il codice coupon deve contenere almeno 3 caratteri")
  return code
}

function normalizedDate(value: unknown) {
  const date = String(value || "").trim()
  if (!date) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new CouponError("Data coupon non valida")
  return date
}

export function normalizeCouponInput(value: Record<string, unknown>): CouponRecord {
  const code = normalizeCouponCode(value.code)
  const type: CouponType = value.type === "fixed" ? "fixed" : "percentage"
  const amount = Math.round(Number(value.value) * 100) / 100
  const minSubtotal = Math.max(0, Math.round(Number(value.minSubtotal || 0) * 100) / 100)
  const rawMaxUses = Number(value.maxUses || 0)
  const maxUses = Number.isFinite(rawMaxUses) && rawMaxUses > 0 ? Math.floor(rawMaxUses) : null
  const startsAt = normalizedDate(value.startsAt)
  const endsAt = normalizedDate(value.endsAt)

  if (!Number.isFinite(amount) || amount <= 0) throw new CouponError("Valore dello sconto non valido")
  if (type === "percentage" && amount > 100) throw new CouponError("Lo sconto percentuale non può superare il 100%")
  if (startsAt && endsAt && endsAt < startsAt) throw new CouponError("La data finale deve essere successiva alla data iniziale")

  return {
    code,
    description: String(value.description || "").trim().slice(0, 200),
    type,
    value: amount,
    active: value.active !== false,
    startsAt,
    endsAt,
    minSubtotal,
    maxUses,
    usageCount: Math.max(0, Math.floor(Number(value.usageCount || 0))),
  }
}

function asCoupon(data: Record<string, any>, code: string): CouponRecord {
  return {
    code,
    description: String(data.description || ""),
    type: data.type === "fixed" ? "fixed" : "percentage",
    value: Number(data.value || 0),
    active: data.active !== false,
    startsAt: data.startsAt || null,
    endsAt: data.endsAt || null,
    minSubtotal: Number(data.minSubtotal || 0),
    maxUses: Number(data.maxUses || 0) > 0 ? Number(data.maxUses) : null,
    usageCount: Number(data.usageCount || 0),
  }
}

function validateCoupon(coupon: CouponRecord, subtotal: number, checkIn?: string) {
  if (!coupon.active) throw new CouponError("Questo coupon non è attivo")
  if (!Number.isFinite(subtotal) || subtotal <= 0) throw new CouponError("Totale prenotazione non valido")
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    throw new CouponError(`Il coupon richiede un importo minimo di €${coupon.minSubtotal.toFixed(2)}`)
  }
  if (coupon.maxUses && Number(coupon.usageCount || 0) >= coupon.maxUses) {
    throw new CouponError("Questo coupon ha raggiunto il numero massimo di utilizzi")
  }

  const referenceDate = checkIn || new Date().toISOString().slice(0, 10)
  if (coupon.startsAt && referenceDate < coupon.startsAt) throw new CouponError("Questo coupon non è ancora valido")
  if (coupon.endsAt && referenceDate > coupon.endsAt) throw new CouponError("Questo coupon è scaduto")
}

function calculateDiscount(coupon: CouponRecord, subtotal: number) {
  const raw = coupon.type === "percentage" ? subtotal * (coupon.value / 100) : coupon.value
  return Math.min(subtotal, Math.max(0, Math.round(raw * 100) / 100))
}

export async function validateCouponCode({
  code,
  subtotal,
  checkIn,
}: {
  code: string
  subtotal: number
  checkIn?: string
}) {
  const normalizedCode = normalizeCouponCode(code)
  const snapshot = await getAdminDb().collection("coupons").doc(normalizedCode).get()
  if (!snapshot.exists) throw new CouponError("Coupon non trovato", 404)

  const coupon = asCoupon(snapshot.data() || {}, normalizedCode)
  validateCoupon(coupon, subtotal, checkIn)
  const discount = calculateDiscount(coupon, subtotal)

  return {
    valid: true,
    code: normalizedCode,
    type: coupon.type,
    value: coupon.value,
    description: coupon.description || "",
    discount,
    finalTotal: Math.max(0, Math.round((subtotal - discount) * 100) / 100),
  }
}

export async function claimCouponForBooking({
  code,
  subtotal,
  checkIn,
  bookingId,
}: {
  code: string
  subtotal: number
  checkIn?: string
  bookingId: string
}) {
  const normalizedCode = normalizeCouponCode(code)
  const safeBookingId = String(bookingId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)
  if (!safeBookingId) throw new CouponError("Codice prenotazione non valido")

  const db = getAdminDb()
  const couponRef = db.collection("coupons").doc(normalizedCode)
  const usageRef = db.collection("coupon_usages").doc(`${normalizedCode}_${safeBookingId}`)

  return db.runTransaction(async (transaction) => {
    const [couponSnapshot, usageSnapshot] = await Promise.all([
      transaction.get(couponRef),
      transaction.get(usageRef),
    ])

    if (usageSnapshot.exists) {
      const data = usageSnapshot.data() || {}
      return {
        valid: true,
        code: normalizedCode,
        discount: Number(data.discount || 0),
        finalTotal: Number(data.finalTotal || subtotal),
      }
    }

    if (!couponSnapshot.exists) throw new CouponError("Coupon non trovato", 404)
    const coupon = asCoupon(couponSnapshot.data() || {}, normalizedCode)
    validateCoupon(coupon, subtotal, checkIn)

    const discount = calculateDiscount(coupon, subtotal)
    const finalTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100)
    const usageCount = Number(coupon.usageCount || 0)

    transaction.update(couponRef, {
      usageCount: usageCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    })
    transaction.set(usageRef, {
      code: normalizedCode,
      bookingId: safeBookingId,
      subtotal,
      discount,
      finalTotal,
      createdAt: FieldValue.serverTimestamp(),
    })

    return { valid: true, code: normalizedCode, discount, finalTotal }
  })
}
