import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { sendModificationEmail } from "@/lib/email"
import { FieldValue } from "firebase-admin/firestore"

// Lazy Stripe init - wrapped in closure to avoid build-time evaluation
const getStripe = (() => {
  let instance: Stripe | null = null
  return (): Stripe | null => {
    if (!instance && process.env.STRIPE_SECRET_KEY) {
      instance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-10-29.clover" })
    }
    return instance
  }
})()

export async function GET(request: NextRequest) {
  console.log("[v0 PAYMENT SUCCESS] ====== START ======")

  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get("session_id")
  const bookingId = searchParams.get("booking_id")

  console.log("[v0 PAYMENT SUCCESS] Session ID:", sessionId)
  console.log("[v0 PAYMENT SUCCESS] Booking ID:", bookingId)

  if (!sessionId || !bookingId) {
    console.log("[v0 PAYMENT SUCCESS] Missing parameters, redirecting to booking")
    return NextResponse.redirect(new URL(`/user/booking/${bookingId}`, request.url))
  }

  try {
    const stripe = getStripe()
    if (!stripe) {
      console.log("[v0 PAYMENT SUCCESS] Stripe not configured")
      return NextResponse.redirect(new URL(`/user/booking/${bookingId}?error=stripe_not_configured`, request.url))
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("[v0 PAYMENT SUCCESS] Stripe session status:", session.payment_status)
    console.log("[v0 PAYMENT SUCCESS] Metadata:", session.metadata)

    if (session.payment_status !== "paid") {
      console.log("[v0 PAYMENT SUCCESS] Payment not completed")
      return NextResponse.redirect(new URL(`/user/booking/${bookingId}?error=payment_failed`, request.url))
    }

    const metadata = session.metadata!
    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingDoc = await bookingRef.get()

    if (!bookingDoc.exists) {
      console.log("[v0 PAYMENT SUCCESS] Booking not found")
      return NextResponse.redirect(new URL(`/user/booking/${bookingId}?error=booking_not_found`, request.url))
    }

    const booking = bookingDoc.data()
    if (!booking) {
      return NextResponse.redirect(new URL(`/user/booking/${bookingId}?error=booking_data_missing`, request.url))
    }
    const depositAmount = Number(session.amount_total) / 100

    if (metadata.type === "change_dates") {
      console.log("[v0 PAYMENT SUCCESS] Processing change_dates payment")

      const priceDifference = Number(metadata.priceDifference)
      const balanceAmount = priceDifference - depositAmount
      const newTotalAmount = Number(metadata.newTotalAmount)

      await bookingRef.update({
        checkIn: new Date(metadata.checkIn),
        checkOut: new Date(metadata.checkOut),
        nights: Number(metadata.nights || 1),
        totalAmount: newTotalAmount,
        depositPaid: FieldValue.increment(depositAmount * 100),
        balanceDue: FieldValue.increment(balanceAmount * 100),
        updatedAt: FieldValue.serverTimestamp(),
      })

      console.log("[v0 PAYMENT SUCCESS] Database updated successfully")

      await sendModificationEmail({
        to: booking.email,
        bookingId: bookingId,
        firstName: booking.firstName,
        lastName: booking.lastName,
        oldCheckIn: booking.checkIn.toDate().toLocaleDateString("it-IT"),
        oldCheckOut: booking.checkOut.toDate().toLocaleDateString("it-IT"),
        newCheckIn: metadata.checkIn,
        newCheckOut: metadata.checkOut,
        penaltyAmount: Number(metadata.penaltyAmount || 0) / 100,
        priceDifference: priceDifference / 100,
        depositPaid: depositAmount,
        newTotalDeposit: ((booking.depositPaid || 0) + depositAmount * 100) / 100,
        newBalanceDue: ((booking.balanceDue || 0) + balanceAmount * 100) / 100,
      })

      console.log("[v0 PAYMENT SUCCESS] Email sent successfully")
    }

    console.log("[v0 PAYMENT SUCCESS] ====== SUCCESS ======")
    return NextResponse.redirect(new URL(`/user/booking/${bookingId}?success=date_changed`, request.url))
  } catch (error) {
    console.error("[v0 PAYMENT SUCCESS] Error:", error)
    return NextResponse.redirect(new URL(`/user/booking/${bookingId}?error=processing_failed`, request.url))
  }
}
