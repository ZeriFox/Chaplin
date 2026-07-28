import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, description } = await request.json()

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingDoc = await db.collection("bookings").doc(bookingId).get()

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingDoc.data()

    if (!booking.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found for this booking" }, { status: 400 })
    }

    // Create checkout session for penalty payment
    const session = await stripe.checkout.sessions.create({
      customer: booking.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Penale di Cancellazione",
              description: description || `Penale per prenotazione ${bookingId}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=cancelled`,
      metadata: {
        bookingId,
        paymentType: "penalty",
      },
    })

    // Update booking in database
    await db
      .collection("bookings")
      .doc(bookingId)
      .update({
        penaltyAmount: FieldValue.increment(amount * 100),
        pendingPenaltySessionId: session.id,
        updatedAt: FieldValue.serverTimestamp(),
      })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      amount: amount,
    })
  } catch (error: any) {
    console.error("Error charging penalty:", error)
    return NextResponse.json({ error: error.message || "Failed to charge penalty" }, { status: 500 })
  }
}
