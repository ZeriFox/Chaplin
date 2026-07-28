import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendBookingUpdateEmail } from "@/lib/email"
import { calculateNights } from "@/lib/pricing"

// Lazy Stripe init - wrapped in closure to avoid build-time evaluation
const getStripe = (() => {
  let instance: Stripe | null = null
  return (): Stripe | null => {
    if (!instance && process.env.STRIPE_SECRET_KEY) {
      instance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
    }
    return instance
  }
})()

export async function POST(request: NextRequest) {
  try {
    const { sessionId, bookingId, type } = await request.json()

    if (!sessionId || !bookingId || !type) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: "Sistema di pagamento non configurato" }, { status: 500 })
    }

    console.log("[API] Updating booking after payment:", { sessionId, bookingId, type })

    // Retrieve the Stripe session to get metadata
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pagamento non completato" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    const metadata = session.metadata || {}

    if (type === "change_dates") {
      // Update booking with new dates
      const checkIn = metadata.checkIn
      const checkOut = metadata.checkOut
      const newPrice = Number.parseInt(metadata.newPrice || "0")
      const penalty = Number.parseInt(metadata.penalty || "0")
      const priceDifference = Number.parseInt(metadata.priceDifference || "0")
      const originalAmount = Number.parseInt(metadata.originalAmount || "0")
      const nights = calculateNights(checkIn, checkOut)

      await bookingRef.update({
        checkIn,
        checkOut,
        nights,
        totalAmount: newPrice,
        updatedAt: FieldValue.serverTimestamp(),
        modifications: FieldValue.arrayUnion({
          type: "change_dates",
          timestamp: new Date().toISOString(),
          oldCheckIn: booking?.checkIn,
          oldCheckOut: booking?.checkOut,
          newCheckIn: checkIn,
          newCheckOut: checkOut,
          penalty,
          priceDifference,
          stripeSessionId: sessionId,
        }),
      })

      // Send update email
      try {
        await sendBookingUpdateEmail({
          to: booking?.email || "",
          bookingId,
          firstName: booking?.firstName || "",
          lastName: booking?.lastName || "",
          roomName: booking?.roomName || "",
          checkIn,
          checkOut,
          guests: booking?.guests || 2,
          nights,
          originalAmount,
          newAmount: newPrice,
          penalty,
          priceDifference,
          modificationType: "change_dates",
        })
      } catch (error) {
        console.error("[API] Error sending update email:", error)
      }

      console.log("[API] Booking dates updated successfully")
    } else if (type === "add_guests") {
      // Update booking with new guest count
      const newGuestsCount = Number.parseInt(metadata.newGuestsCount || "0")
      const newTotalAmount = Number.parseInt(metadata.newTotalAmount || "0")
      const priceDifference = Number.parseInt(metadata.priceDifference || "0")
      const originalAmount = Number.parseInt(metadata.originalAmount || "0")
      const nights = calculateNights(booking?.checkIn, booking?.checkOut)

      await bookingRef.update({
        guests: newGuestsCount,
        totalAmount: newTotalAmount,
        updatedAt: FieldValue.serverTimestamp(),
        modifications: FieldValue.arrayUnion({
          type: "add_guests",
          timestamp: new Date().toISOString(),
          oldGuests: booking?.guests,
          newGuests: newGuestsCount,
          priceDifference,
          stripeSessionId: sessionId,
        }),
      })

      // Send update email
      try {
        await sendBookingUpdateEmail({
          to: booking?.email || "",
          bookingId,
          firstName: booking?.firstName || "",
          lastName: booking?.lastName || "",
          roomName: booking?.roomName || "",
          checkIn: booking?.checkIn || "",
          checkOut: booking?.checkOut || "",
          guests: newGuestsCount,
          nights,
          originalAmount,
          newAmount: newTotalAmount,
          priceDifference,
          modificationType: "add_guests",
        })
      } catch (error) {
        console.error("[API] Error sending update email:", error)
      }

      console.log("[API] Guests updated successfully")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating booking after payment:", error)
    return NextResponse.json({ error: "Errore nell'aggiornamento della prenotazione" }, { status: 500 })
  }
}
