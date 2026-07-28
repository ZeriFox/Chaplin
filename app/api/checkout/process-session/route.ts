import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { sendModificationEmail } from "@/lib/email"
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
    const { sessionId } = await request.json()

    console.log("[v0 DEBUG] ====== PROCESS SESSION START ======")
    console.log("[v0 DEBUG] Session ID:", sessionId)

    if (!sessionId) {
      console.error("[v0 DEBUG] ❌ Missing session ID")
      return NextResponse.json({ error: "Session ID mancante" }, { status: 400 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: "Sistema di pagamento non configurato" }, { status: 500 })
    }

    console.log("[v0 DEBUG] Retrieving session from Stripe...")
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("[v0 DEBUG] Session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
    })

    if (session.payment_status !== "paid") {
      console.error("[v0 DEBUG] ❌ Payment not completed:", session.payment_status)
      return NextResponse.json({ error: "Pagamento non completato" }, { status: 400 })
    }

    const metadata = session.metadata
    if (!metadata || !metadata.bookingId) {
      console.error("[v0 DEBUG] ❌ Missing metadata:", metadata)
      return NextResponse.json({ error: "Metadati sessione mancanti" }, { status: 400 })
    }

    console.log("[v0 DEBUG] Metadata parsed:", metadata)
    console.log("[v0 DEBUG] Payment type:", metadata.type)

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(metadata.bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      console.error("[v0 DEBUG] ❌ Booking not found:", metadata.bookingId)
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    console.log("[v0 DEBUG] Current booking data:", {
      totalAmount: booking?.totalAmount,
      depositPaid: booking?.depositPaid,
      balanceDue: booking?.balanceDue,
    })

    const isNewBooking = metadata.type !== "change_dates" && metadata.type !== "add_guest"

    if (metadata.type === "change_dates") {
      const depositAmount = Number.parseInt(metadata.depositAmount)
      const balanceAmount = Number.parseInt(metadata.balanceAmount)
      const newTotalAmount = Number.parseInt(metadata.newTotalAmount)
      const penalty = Number.parseInt(metadata.penalty || "0")
      const priceDifference = Number.parseInt(metadata.priceDifference)

      console.log("[v0 DEBUG] ====== CHANGE DATES PAYMENT DETECTED ======")
      console.log("[v0 DEBUG] Amounts:", {
        depositAmount: depositAmount / 100,
        balanceAmount: balanceAmount / 100,
        newTotalAmount: newTotalAmount / 100,
        penalty: penalty / 100,
      })
      console.log("[v0 DEBUG] New dates:", {
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        nights: calculateNights(metadata.checkIn, metadata.checkOut),
      })

      console.log("[v0 DEBUG] Updating booking in database...")
      await bookingRef.update({
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        nights: calculateNights(metadata.checkIn, metadata.checkOut),
        totalAmount: newTotalAmount,
        depositPaid: FieldValue.increment(depositAmount),
        balanceDue: FieldValue.increment(balanceAmount),
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log("[v0 DEBUG] ✅ Database updated successfully")

      console.log("[v0 DEBUG] Sending modification email...")
      await sendModificationEmail({
        to: booking?.email,
        bookingId: metadata.bookingId,
        firstName: booking?.firstName,
        lastName: booking?.lastName,
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        roomName: booking?.roomName,
        guests: booking?.guests || 2,
        nights: calculateNights(metadata.checkIn, metadata.checkOut),
        originalAmount: Number.parseInt(metadata.originalAmount),
        newAmount: newTotalAmount,
        penalty,
        dateChangeCost: priceDifference,
        modificationType: "dates",
      })
      console.log("[v0 DEBUG] ✅ Email sent successfully")
      console.log("[v0 DEBUG] ====== CHANGE DATES COMPLETE ======")
    } else if (metadata.type === "add_guest") {
      const newGuestsCount = Number.parseInt(metadata.newGuestsCount)
      const newTotalAmount = Number.parseInt(metadata.newTotalAmount)
      const originalAmount = Number.parseInt(metadata.originalAmount)
      const guestAdditionCost = Number.parseInt(metadata.guestAdditionCost)

      console.log("[v0 DEBUG] ====== ADD GUEST PAYMENT DETECTED ======")
      console.log("[v0 DEBUG] Amounts:", {
        newTotalAmount: newTotalAmount / 100,
        guestAdditionCost: guestAdditionCost / 100,
      })
      console.log("[v0 DEBUG] New guests count:", newGuestsCount)

      console.log("[v0 DEBUG] Updating booking in database...")
      await bookingRef.update({
        guests: newGuestsCount,
        totalAmount: newTotalAmount,
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log("[v0 DEBUG] ✅ Database updated successfully")

      const nights = calculateNights(booking?.checkIn, booking?.checkOut)
      console.log("[v0 DEBUG] Sending modification email...")
      await sendModificationEmail({
        to: booking?.email,
        bookingId: metadata.bookingId,
        firstName: booking?.firstName,
        lastName: booking?.lastName,
        checkIn: booking?.checkIn,
        checkOut: booking?.checkOut,
        roomName: booking?.roomName,
        guests: newGuestsCount,
        nights,
        originalAmount,
        newAmount: newTotalAmount,
        guestAdditionCost,
        modificationType: "guests",
      })
      console.log("[v0 DEBUG] ✅ Email sent successfully")
      console.log("[v0 DEBUG] ====== ADD GUEST COMPLETE ======")
    } else {
      console.log("[v0 DEBUG] ====== CONFIRMATION PAYMENT DETECTED ======")
      console.log("[v0 DEBUG] Updating booking status to confirmed...")
      await bookingRef.update({
        status: "confirmed",
        paymentProvider: "stripe",
        paymentId: session.payment_intent as string,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log("[v0 DEBUG] ✅ Booking status updated to confirmed after payment")
      console.log("[v0 DEBUG] ====== CONFIRMATION COMPLETE ======")
    }

    const updatedBookingSnap = await bookingRef.get()
    const updatedBooking = updatedBookingSnap.data()

    console.log("[v0 DEBUG] Final booking state:", {
      totalAmount: updatedBooking?.totalAmount,
      depositPaid: updatedBooking?.depositPaid,
      balanceDue: updatedBooking?.balanceDue,
      checkIn: updatedBooking?.checkIn,
      checkOut: updatedBooking?.checkOut,
    })
    console.log("[v0 DEBUG] ====== PROCESS SESSION COMPLETE ======")

    return NextResponse.json({
      success: true,
      booking: {
        id: metadata.bookingId,
        ...updatedBooking,
      },
    })
  } catch (error: any) {
    console.error("[v0 DEBUG] ❌ ERROR in process-session:", error)
    return NextResponse.json({ error: error.message || "Errore nell'elaborazione" }, { status: 500 })
  }
}
