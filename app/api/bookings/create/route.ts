import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      email,
      firstName,
      lastName,
      phone,
      checkIn,
      checkOut,
      guests,
      roomType,
      roomName,
      roomId,
      nights,
      pricePerNight,
      subtotal,
      taxes,
      serviceFee,
      totalAmount,
      specialRequests,
      userId,
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !checkIn || !checkOut || !guests || !roomType) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 })
    }

    const db = getAdminDb()

    // Create booking document
    const bookingRef = db.collection("bookings").doc()
    const bookingId = bookingRef.id

    const bookingData = {
      bookingId,
      userId: userId || null,
      email,
      firstName,
      lastName,
      phone: phone || "",
      checkIn,
      checkOut,
      guests: Number(guests),
      roomType,
      roomName: roomName || roomType,
      roomId: roomId || null,
      nights: Number(nights),
      pricePerNight: Number(pricePerNight),
      subtotal: Number(subtotal),
      taxes: Number(taxes),
      serviceFee: Number(serviceFee || 0),
      totalAmount: Number(totalAmount),
      specialRequests: specialRequests || "",
      status: "pending",
      paymentProvider: null,
      paymentId: null,
      paidAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await bookingRef.set(bookingData)

    console.log("[Create Booking] Booking created:", bookingId)

    return NextResponse.json({
      success: true,
      bookingId,
      booking: bookingData,
    })
  } catch (error: any) {
    console.error("[Create Booking Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to create booking" }, { status: 500 })
  }
}
