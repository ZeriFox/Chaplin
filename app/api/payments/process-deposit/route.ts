import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { calculatePaymentSchedule } from "@/lib/payment-logic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { bookingId, totalAmount, checkInDate, customerEmail, customerName } = await request.json()

    const schedule = calculatePaymentSchedule(totalAmount, new Date(checkInDate))

    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: {
        bookingId,
      },
    })

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Acconto Prenotazione - 30%`,
              description: `Acconto per prenotazione ${bookingId}. Saldo di €${(schedule.balanceAmount / 100).toFixed(2)} dovuto entro ${schedule.balanceDueDate.toLocaleDateString("it-IT")}`,
            },
            unit_amount: schedule.depositAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?cancelled=true`,
      metadata: {
        bookingId,
        paymentType: "deposit",
        totalAmount: totalAmount.toString(),
        depositAmount: schedule.depositAmount.toString(),
        balanceAmount: schedule.balanceAmount.toString(),
        balanceDueDate: schedule.balanceDueDate.toISOString(),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      sessionUrl: session.url,
      schedule,
    })
  } catch (error) {
    console.error("Error creating deposit payment:", error)
    return NextResponse.json({ error: "Failed to create deposit payment" }, { status: 500 })
  }
}
