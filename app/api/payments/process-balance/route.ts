import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    const db = getAdminDb()
    const bookingDoc = await db.collection("bookings").doc(bookingId).get()

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingDoc.data()

    if (booking.paymentStatus === "completed") {
      return NextResponse.json({ error: "Balance already paid" }, { status: 400 })
    }

    const totalAmount = booking.totalAmount || 0
    const depositAmount = booking.depositAmount || Math.round(totalAmount * 0.3)
    const balanceAmount = totalAmount - depositAmount

    console.log("[v0] Creating balance payment:", {
      totalAmount: totalAmount / 100,
      depositAmount: depositAmount / 100,
      balanceAmount: balanceAmount / 100,
    })

    const session = await stripe.checkout.sessions.create({
      customer: booking.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Saldo Prenotazione - 70%`,
              description: `Pagamento finale per prenotazione ${bookingId}`,
            },
            unit_amount: balanceAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}`,
      metadata: {
        bookingId,
        paymentType: "balance",
        balanceAmount: balanceAmount.toString(),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      balanceAmount,
    })
  } catch (error) {
    console.error("Error creating balance payment:", error)
    return NextResponse.json({ error: "Failed to create balance payment" }, { status: 500 })
  }
}
