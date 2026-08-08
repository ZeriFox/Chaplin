import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"
import { BookingConflictError } from "@/lib/booking-rules"
import { cancelBookingWithInventory, saveBookingWithInventory } from "@/lib/booking-inventory"
import { SUITE_ROOM_ID } from "@/lib/suite-room"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AdminBookingInput = {
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  roomId?: string
  roomName?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  totalAmount?: number
  notes?: string
  status?: string
}

function cleanText(value: unknown, maxLength = 250) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function normalizeBooking(body: AdminBookingInput) {
  const firstName = cleanText(body.firstName, 100)
  const lastName = cleanText(body.lastName, 100)
  const email = cleanText(body.email, 200).toLowerCase()
  const phone = cleanText(body.phone, 50)
  const roomName = cleanText(body.roomName, 200) || "La Suite"
  const checkIn = cleanText(body.checkIn, 10)
  const checkOut = cleanText(body.checkOut, 10)
  const notes = cleanText(body.notes, 2_000)
  const guests = Math.max(1, Math.min(2, Math.round(Number(body.guests) || 1)))
  const totalAmount = Math.max(0, Math.round((Number(body.totalAmount) || 0) * 100) / 100)
  const status = body.status === "pending" ? "pending" : "confirmed"

  if (!firstName || !lastName || !email || !phone || !checkIn || !checkOut) {
    return { error: "Nome, cognome, email, telefono e date sono obbligatori" } as const
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Indirizzo email non valido" } as const
  }
  if (phone.replace(/\D/g, "").length < 7) {
    return { error: "Numero di telefono non valido" } as const
  }

  const checkInDate = new Date(`${checkIn}T00:00:00`)
  const checkOutDate = new Date(`${checkOut}T00:00:00`)
  const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000)
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || nights <= 0) {
    return { error: "Intervallo di date non valido" } as const
  }

  return {
    data: {
      guestFirst: firstName,
      guestLast: lastName,
      firstName,
      lastName,
      email,
      phone,
      roomId: SUITE_ROOM_ID,
      roomName,
      checkIn,
      checkOut,
      guests,
      nights,
      total: totalAmount,
      totalAmount,
      currency: "EUR",
      notes,
      specialRequests: notes,
      status,
    },
  } as const
}

function conflictResponse(error: unknown) {
  if (error instanceof BookingConflictError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminApi(request)
    const normalized = normalizeBooking((await request.json()) as AdminBookingInput)
    if ("error" in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 })

    const bookingRef = getAdminDb().collection("bookings").doc()
    await saveBookingWithInventory({
      bookingRef,
      bookingData: {
        ...normalized.data,
        bookingId: bookingRef.id,
        origin: "direct",
        services: [],
        adminManaged: true,
        createdBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      merge: false,
    })
    return NextResponse.json({ success: true, bookingId: bookingRef.id })
  } catch (error) {
    const conflict = conflictResponse(error)
    if (conflict) return conflict
    console.error("[Admin Bookings] Create error:", error)
    return adminApiErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminApi(request)
    const body = (await request.json()) as AdminBookingInput
    const bookingId = cleanText(body.id, 100)
    if (!bookingId) return NextResponse.json({ error: "Prenotazione mancante" }, { status: 400 })

    const normalized = normalizeBooking(body)
    if ("error" in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 })
    const bookingRef = getAdminDb().collection("bookings").doc(bookingId)
    if (!(await bookingRef.get()).exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    await saveBookingWithInventory({
      bookingRef,
      bookingData: {
        ...normalized.data,
        adminManaged: true,
        updatedBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const conflict = conflictResponse(error)
    if (conflict) return conflict
    console.error("[Admin Bookings] Update error:", error)
    return adminApiErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdminApi(request)
    const bookingId = cleanText(new URL(request.url).searchParams.get("id"), 100)
    if (!bookingId) return NextResponse.json({ error: "Prenotazione mancante" }, { status: 400 })

    await cancelBookingWithInventory({
      bookingRef: getAdminDb().collection("bookings").doc(bookingId),
      cancellationData: {
        cancellationReason: "admin_cancellation",
        cancelledBy: admin.uid,
        cancelledAt: FieldValue.serverTimestamp(),
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const conflict = conflictResponse(error)
    if (conflict) return conflict
    console.error("[Admin Bookings] Cancellation error:", error)
    return adminApiErrorResponse(error)
  }
}
