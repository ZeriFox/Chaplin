import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

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

async function requireAdmin(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || ""
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""
    if (!token) return null

    const decoded = await getAdminAuth().verifyIdToken(token)
    const userDocument = await getAdminDb().collection("users").doc(decoded.uid).get()
    return userDocument.data()?.role === "admin" ? decoded : null
  } catch (error) {
    console.error("[Admin Bookings] Authorization error:", error)
    return null
  }
}

function normalizeBooking(body: AdminBookingInput) {
  const firstName = cleanText(body.firstName, 100)
  const lastName = cleanText(body.lastName, 100)
  const email = cleanText(body.email, 200).toLowerCase()
  const phone = cleanText(body.phone, 50)
  const roomId = cleanText(body.roomId, 100)
  const roomName = cleanText(body.roomName, 200)
  const checkIn = cleanText(body.checkIn, 10)
  const checkOut = cleanText(body.checkOut, 10)
  const notes = cleanText(body.notes, 2_000)
  const guests = Math.max(1, Math.min(2, Math.round(Number(body.guests) || 1)))
  const totalAmount = Math.max(0, Math.round((Number(body.totalAmount) || 0) * 100) / 100)
  const status = body.status === "pending" ? "pending" : "confirmed"

  if (!firstName || !lastName || !roomId || !roomName || !checkIn || !checkOut) {
    return { error: "Compila tutti i campi obbligatori" } as const
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Indirizzo email non valido" } as const
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
      roomId,
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

async function hasDateConflict(roomId: string, checkIn: string, checkOut: string, excludedId?: string) {
  const snapshot = await getAdminDb().collection("bookings").where("roomId", "==", roomId).get()

  return snapshot.docs.some((document) => {
    if (document.id === excludedId) return false
    const booking = document.data()
    if (booking.status === "cancelled") return false

    const existingCheckIn = cleanText(booking.checkIn, 10)
    const existingCheckOut = cleanText(booking.checkOut, 10)
    return existingCheckIn < checkOut && existingCheckOut > checkIn
  })
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (!adminUser) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const normalized = normalizeBooking((await request.json()) as AdminBookingInput)
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    if (
      await hasDateConflict(
        normalized.data.roomId,
        normalized.data.checkIn,
        normalized.data.checkOut,
      )
    ) {
      return NextResponse.json(
        { error: "Esiste già una prenotazione attiva per questa suite nelle date selezionate" },
        { status: 409 },
      )
    }

    const bookingRef = getAdminDb().collection("bookings").doc()
    await bookingRef.set({
      ...normalized.data,
      bookingId: bookingRef.id,
      origin: "direct",
      services: [],
      adminManaged: true,
      createdBy: adminUser.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, bookingId: bookingRef.id })
  } catch (error) {
    console.error("[Admin Bookings] Create error:", error)
    return NextResponse.json({ error: "Impossibile creare la prenotazione" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (!adminUser) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const body = (await request.json()) as AdminBookingInput
    const bookingId = cleanText(body.id, 100)
    if (!bookingId) return NextResponse.json({ error: "Prenotazione mancante" }, { status: 400 })

    const normalized = normalizeBooking(body)
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const bookingRef = getAdminDb().collection("bookings").doc(bookingId)
    const bookingSnapshot = await bookingRef.get()
    if (!bookingSnapshot.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    if (
      await hasDateConflict(
        normalized.data.roomId,
        normalized.data.checkIn,
        normalized.data.checkOut,
        bookingId,
      )
    ) {
      return NextResponse.json(
        { error: "Esiste già una prenotazione attiva per questa suite nelle date selezionate" },
        { status: 409 },
      )
    }

    await bookingRef.update({
      ...normalized.data,
      adminManaged: true,
      updatedBy: adminUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Admin Bookings] Update error:", error)
    return NextResponse.json({ error: "Impossibile modificare la prenotazione" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (!adminUser) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const bookingId = cleanText(new URL(request.url).searchParams.get("id"), 100)
    if (!bookingId) return NextResponse.json({ error: "Prenotazione mancante" }, { status: 400 })

    const bookingRef = getAdminDb().collection("bookings").doc(bookingId)
    const bookingSnapshot = await bookingRef.get()
    if (!bookingSnapshot.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    await bookingRef.update({
      status: "cancelled",
      cancellationReason: "admin_cancellation",
      cancelledBy: adminUser.uid,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Admin Bookings] Cancellation error:", error)
    return NextResponse.json({ error: "Impossibile annullare la prenotazione" }, { status: 500 })
  }
}
