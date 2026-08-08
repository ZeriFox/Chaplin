import "server-only"

import { createHash } from "node:crypto"
import { FieldValue, type Transaction } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"
import { calculateCouponDiscount, CouponRuleError, validateCouponRule } from "@/lib/coupon-rules"

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
  maxUsesPerCustomer?: number | null
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
  const rawMaxUsesPerCustomer = Number(value.maxUsesPerCustomer || 0)
  const maxUsesPerCustomer =
    Number.isFinite(rawMaxUsesPerCustomer) && rawMaxUsesPerCustomer > 0
      ? Math.floor(rawMaxUsesPerCustomer)
      : null
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
    maxUsesPerCustomer,
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
    maxUsesPerCustomer: Number(data.maxUsesPerCustomer || 0) > 0 ? Number(data.maxUsesPerCustomer) : null,
    usageCount: Number(data.usageCount || 0),
  }
}

function validateCoupon(coupon: CouponRecord, subtotal: number, checkIn?: string, customerUsageCount = 0) {
  try {
    validateCouponRule(coupon, {
      subtotal,
      referenceDate: checkIn || new Date().toISOString().slice(0, 10),
      customerUsageCount,
    })
  } catch (error) {
    if (error instanceof CouponRuleError) throw new CouponError(error.message, error.status)
    throw error
  }
}

function calculateDiscount(coupon: CouponRecord, subtotal: number) {
  return calculateCouponDiscount(coupon, subtotal)
}

function normalizeCustomerEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CouponError("Inserisci un indirizzo email valido per usare il coupon")
  }
  return email
}

function customerKey(email: string) {
  return createHash("sha256").update(email).digest("hex").slice(0, 40)
}

export async function validateCouponCode({
  code,
  subtotal,
  checkIn,
  customerEmail,
}: {
  code: string
  subtotal: number
  checkIn?: string
  customerEmail?: string
}) {
  const normalizedCode = normalizeCouponCode(code)
  const db = getAdminDb()
  const snapshot = await db.collection("coupons").doc(normalizedCode).get()
  if (!snapshot.exists) throw new CouponError("Coupon non trovato", 404)

  const coupon = asCoupon(snapshot.data() || {}, normalizedCode)
  let customerUsageCount = 0
  if (customerEmail) {
    const email = normalizeCustomerEmail(customerEmail)
    const customerSnapshot = await db.collection("coupon_customer_usage").doc(`${normalizedCode}_${customerKey(email)}`).get()
    customerUsageCount = Number(customerSnapshot.data()?.count || 0)
  }
  validateCoupon(coupon, subtotal, checkIn, customerUsageCount)
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
  customerEmail,
}: {
  code: string
  subtotal: number
  checkIn?: string
  bookingId: string
  customerEmail: string
}) {
  const normalizedCode = normalizeCouponCode(code)
  const safeBookingId = String(bookingId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)
  if (!safeBookingId) throw new CouponError("Codice prenotazione non valido")

  const db = getAdminDb()
  return db.runTransaction((transaction) =>
    claimCouponInTransaction({
      transaction,
      code: normalizedCode,
      subtotal,
      checkIn,
      bookingId: safeBookingId,
      customerEmail,
    }),
  )
}

export async function claimCouponInTransaction({
  transaction,
  code,
  subtotal,
  checkIn,
  bookingId,
  customerEmail,
}: {
  transaction: Transaction
  code: string
  subtotal: number
  checkIn?: string
  bookingId: string
  customerEmail: string
}) {
  const normalizedCode = normalizeCouponCode(code)
  const safeBookingId = String(bookingId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)
  if (!safeBookingId) throw new CouponError("Codice prenotazione non valido")
  const email = normalizeCustomerEmail(customerEmail)
  const hashedCustomer = customerKey(email)
  const db = getAdminDb()
  const couponRef = db.collection("coupons").doc(normalizedCode)
  const usageRef = db.collection("coupon_usages").doc(`${normalizedCode}_${safeBookingId}`)
  const customerUsageRef = db.collection("coupon_customer_usage").doc(`${normalizedCode}_${hashedCustomer}`)
  const [couponSnapshot, usageSnapshot, customerUsageSnapshot] = await Promise.all([
    transaction.get(couponRef),
    transaction.get(usageRef),
    transaction.get(customerUsageRef),
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
  const customerUsageCount = Number(customerUsageSnapshot.data()?.count || 0)
  validateCoupon(coupon, subtotal, checkIn, customerUsageCount)

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
    customerKey: hashedCustomer,
    subtotal,
    discount,
    finalTotal,
    createdAt: FieldValue.serverTimestamp(),
  })
  transaction.set(
    customerUsageRef,
    {
      code: normalizedCode,
      customerKey: hashedCustomer,
      count: customerUsageCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
      ...(customerUsageSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  )

  return { valid: true, code: normalizedCode, discount, finalTotal }
}
