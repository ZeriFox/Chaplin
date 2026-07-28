import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { sendBookingConfirmationEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json()

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Missing bookingId" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.doc(`bookings/${bookingId}`)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingSnap.data() as any

    // Send confirmation email
    const result = await sendBookingConfirmationEmail({
      to: booking.email,
      bookingId: bookingId,
      firstName: booking.firstName,
      lastName: booking.lastName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomName: booking.roomName,
      guests: booking.guests,
      totalAmount: booking.totalAmount,
      nights: booking.nights,
      newUserPassword: booking.newUserPassword,
    })

    if (result.success) {
      return NextResponse.json({ success: true, emailId: result.emailId })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] Error resending booking email:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
