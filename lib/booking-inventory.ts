import "server-only"

import { FieldValue, type DocumentReference } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"
import {
  BookingConflictError,
  dateRangesOverlap,
  enumerateStayDates,
  isActiveBookingStatus,
} from "@/lib/booking-rules"
import { claimCouponInTransaction } from "@/lib/coupons"

const INVENTORY_COLLECTION = "booking_inventory"

type CouponClaimInput = {
  code: string
  subtotal: number
  checkIn?: string
  customerEmail: string
}

function cleanId(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)
}

export function inventoryDocumentId(roomId: string, date: string) {
  const safeRoomId = cleanId(roomId)
  if (!safeRoomId) throw new BookingConflictError("Suite non valida", 400)
  return `${safeRoomId}_${date}`
}

function bookingDates(data: Record<string, unknown> | undefined) {
  if (!data || !isActiveBookingStatus(data.status)) return []
  try {
    return enumerateStayDates(String(data.checkIn || ""), String(data.checkOut || ""))
  } catch {
    return []
  }
}

function conflictsWithBlockedDate(
  blocked: Record<string, unknown>,
  roomId: string,
  checkIn: string,
  checkOut: string,
) {
  if (String(blocked.roomId || "") !== roomId) return false
  const from = String(blocked.from || blocked.checkIn || "")
  const to = String(blocked.to || blocked.checkOut || "")
  return Boolean(from && to && dateRangesOverlap(checkIn, checkOut, from, to))
}

export async function checkServerAvailability({
  roomId,
  checkIn,
  checkOut,
  excludedBookingId,
}: {
  roomId: string
  checkIn: string
  checkOut: string
  excludedBookingId?: string
}) {
  const dates = enumerateStayDates(checkIn, checkOut)
  const db = getAdminDb()
  const inventoryRefs = dates.map((date) => db.collection(INVENTORY_COLLECTION).doc(inventoryDocumentId(roomId, date)))
  const [bookingSnapshot, blockedSnapshot, ...inventorySnapshots] = await Promise.all([
    db.collection("bookings").where("roomId", "==", roomId).get(),
    db.collection("blocked_dates").where("roomId", "==", roomId).get(),
    ...inventoryRefs.map((ref) => ref.get()),
  ])

  const inventoryConflict = inventorySnapshots.find((snapshot) => {
    if (!snapshot.exists) return false
    return String(snapshot.data()?.bookingId || "") !== String(excludedBookingId || "")
  })
  if (inventoryConflict) return { available: false, reason: "booking" as const }

  const bookingConflict = bookingSnapshot.docs.find((document) => {
    if (document.id === excludedBookingId) return false
    const booking = document.data()
    return (
      isActiveBookingStatus(booking.status) &&
      dateRangesOverlap(checkIn, checkOut, String(booking.checkIn || ""), String(booking.checkOut || ""))
    )
  })
  if (bookingConflict) return { available: false, reason: "booking" as const }

  if (blockedSnapshot.docs.some((document) => conflictsWithBlockedDate(document.data(), roomId, checkIn, checkOut))) {
    return { available: false, reason: "blocked" as const }
  }

  return { available: true as const }
}

export async function saveBookingWithInventory({
  bookingRef,
  bookingData,
  coupon,
  merge = true,
}: {
  bookingRef: DocumentReference
  bookingData: Record<string, unknown>
  coupon?: CouponClaimInput | null
  merge?: boolean
}) {
  const db = getAdminDb()
  const bookingId = bookingRef.id
  const roomId = String(bookingData.roomId || "")
  const checkIn = String(bookingData.checkIn || "")
  const checkOut = String(bookingData.checkOut || "")
  const newDates = enumerateStayDates(checkIn, checkOut)

  return db.runTransaction(async (transaction) => {
    const existingSnapshot = await transaction.get(bookingRef)
    const existingData = existingSnapshot.data() as Record<string, unknown> | undefined
    const oldRoomId = String(existingData?.roomId || roomId)
    const oldDates = bookingDates(existingData)
    const allInventoryRefs = new Map<string, DocumentReference>()

    for (const date of oldDates) {
      const ref = db.collection(INVENTORY_COLLECTION).doc(inventoryDocumentId(oldRoomId, date))
      allInventoryRefs.set(ref.path, ref)
    }
    for (const date of newDates) {
      const ref = db.collection(INVENTORY_COLLECTION).doc(inventoryDocumentId(roomId, date))
      allInventoryRefs.set(ref.path, ref)
    }

    const inventorySnapshots = allInventoryRefs.size
      ? await transaction.getAll(...Array.from(allInventoryRefs.values()))
      : []
    const activeBookings = await transaction.get(db.collection("bookings").where("roomId", "==", roomId))
    const blockedDates = await transaction.get(db.collection("blocked_dates").where("roomId", "==", roomId))

    const occupied = inventorySnapshots.some((snapshot) => {
      if (!snapshot.exists || !newDates.some((date) => snapshot.id === inventoryDocumentId(roomId, date))) return false
      return String(snapshot.data()?.bookingId || "") !== bookingId
    })
    if (occupied) throw new BookingConflictError()

    const overlapsExisting = activeBookings.docs.some((document) => {
      if (document.id === bookingId) return false
      const booking = document.data()
      return (
        isActiveBookingStatus(booking.status) &&
        dateRangesOverlap(checkIn, checkOut, String(booking.checkIn || ""), String(booking.checkOut || ""))
      )
    })
    if (overlapsExisting) throw new BookingConflictError()

    if (blockedDates.docs.some((document) => conflictsWithBlockedDate(document.data(), roomId, checkIn, checkOut))) {
      throw new BookingConflictError("La suite è chiusa o in manutenzione nelle date selezionate")
    }

    const couponResult = coupon
      ? await claimCouponInTransaction({
          transaction,
          code: coupon.code,
          subtotal: coupon.subtotal,
          checkIn: coupon.checkIn,
          bookingId,
          customerEmail: coupon.customerEmail,
        })
      : null

    for (const snapshot of inventorySnapshots) {
      const belongsToBooking = String(snapshot.data()?.bookingId || "") === bookingId
      const remainsReserved = newDates.some((date) => snapshot.id === inventoryDocumentId(roomId, date))
      if (snapshot.exists && belongsToBooking && !remainsReserved) transaction.delete(snapshot.ref)
    }
    for (const date of newDates) {
      const ref = db.collection(INVENTORY_COLLECTION).doc(inventoryDocumentId(roomId, date))
      transaction.set(ref, {
        bookingId,
        roomId,
        date,
        status: String(bookingData.status || "pending"),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    const finalBookingData = couponResult
      ? {
          ...bookingData,
          couponCode: couponResult.code,
          discountAmount: Math.round(couponResult.discount * 100),
          total: Math.round(couponResult.finalTotal * 100),
          totalAmount: Math.round(couponResult.finalTotal * 100),
        }
      : bookingData
    if (!existingSnapshot.exists && !("createdAt" in finalBookingData)) {
      finalBookingData.createdAt = FieldValue.serverTimestamp()
    }
    transaction.set(bookingRef, finalBookingData, { merge })

    return { bookingId, dates: newDates, coupon: couponResult, bookingData: finalBookingData }
  })
}

export async function cancelBookingWithInventory({
  bookingRef,
  cancellationData,
}: {
  bookingRef: DocumentReference
  cancellationData: Record<string, unknown>
}) {
  const db = getAdminDb()
  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef)
    if (!bookingSnapshot.exists) throw new BookingConflictError("Prenotazione non trovata", 404)
    const booking = bookingSnapshot.data() as Record<string, unknown>
    const roomId = String(booking.roomId || "")
    const dates = bookingDates(booking)
    const refs = dates.map((date) => db.collection(INVENTORY_COLLECTION).doc(inventoryDocumentId(roomId, date)))
    const snapshots = refs.length ? await transaction.getAll(...refs) : []

    for (const snapshot of snapshots) {
      if (snapshot.exists && String(snapshot.data()?.bookingId || "") === bookingRef.id) {
        transaction.delete(snapshot.ref)
      }
    }
    transaction.update(bookingRef, {
      ...cancellationData,
      status: "cancelled",
      originalOrigin: booking.origin || null,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return booking
  })
}
