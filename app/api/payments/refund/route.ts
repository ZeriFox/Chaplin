import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { refundOperation, findPaymentOperation, isNexiConfigured } from "@/lib/nexi-client"

// Lazy Stripe init - wrapped in closure to avoid build-time evaluation
const getStripe = (() => {
  let instance: Stripe | null = null
  return (): Stripe | null => {
    if (!instance && process.env.STRIPE_SECRET_KEY) {
      instance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })
    }
    return instance
  }
})()

export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, reason } = await request.json()

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingDoc = await db.collection("bookings").doc(bookingId).get()

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingDoc.data()!
    const paymentProvider = booking.paymentProvider || "stripe"

    if (paymentProvider === "nexi") {
      // --- NEXI REFUND ---
      if (!isNexiConfigured()) {
        return NextResponse.json(
          { error: "Nexi non configurato. Rimborso deve essere elaborato manualmente.", provider: "nexi", status: "pending_manual_processing" },
          { status: 400 },
        )
      }

      const nexiOrderId = booking.nexiOrderId
      if (!nexiOrderId) {
        return NextResponse.json(
          { error: "No Nexi order found for this booking. Refund must be processed manually." },
          { status: 400 },
        )
      }

      try {
        // Find the operationId from the order
        let operationId = booking.nexiOperationId
        if (!operationId) {
          const payOp = await findPaymentOperation(nexiOrderId)
          if (!payOp) {
            return NextResponse.json(
              { error: "Operazione di pagamento Nexi non trovata. Rimborso manuale necessario." },
              { status: 400 },
            )
          }
          operationId = payOp.operationId
        }

        const refundResult = await refundOperation(
          operationId,
          Math.round(amount * 100),
          booking.currency || "EUR",
          `Rimborso prenotazione ${bookingId}${reason ? ` - ${reason}` : ""}`,
        )

        await db
          .collection("bookings")
          .doc(bookingId)
          .update({
            refundAmount: FieldValue.increment(amount),
            nexiRefundOperationId: refundResult.operationId,
            refundStatus: refundResult.operationResult || "succeeded",
            refundProvider: "nexi",
            updatedAt: FieldValue.serverTimestamp(),
          })

        return NextResponse.json({
          success: true,
          refundId: refundResult.operationId,
          amount,
          status: refundResult.operationResult || "succeeded",
          provider: "nexi",
        })
      } catch (nexiError: any) {
        console.error("[Nexi Refund Error]", nexiError)
        // If Nexi refund fails, mark as pending manual processing
        await db.collection("bookings").doc(bookingId).update({
          pendingRefund: {
            amount,
            reason: reason || "booking_cancelled",
            requestedAt: FieldValue.serverTimestamp(),
            status: "pending_manual_processing",
            provider: "nexi",
            error: nexiError.message,
          },
          updatedAt: FieldValue.serverTimestamp(),
        })

        return NextResponse.json({
          success: true,
          amount,
          status: "pending_manual_processing",
          provider: "nexi",
          message: "Rimborso Nexi in elaborazione manuale. Contattare il supporto se necessario.",
        })
      }
    } else {
      // --- STRIPE REFUND ---
      const stripe = getStripe()
      if (!stripe) {
        return NextResponse.json(
          { error: "Stripe non configurato. Rimborso deve essere elaborato manualmente." },
          { status: 400 },
        )
      }
      if (!booking.stripePaymentIntentId) {
        return NextResponse.json(
          { error: "No Stripe payment intent found for this booking. Refund must be processed manually." },
          { status: 400 },
        )
      }

      const refund = await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: reason || "requested_by_customer",
      })

      await db
        .collection("bookings")
        .doc(bookingId)
        .update({
          refundAmount: FieldValue.increment(amount),
          stripeRefundId: refund.id,
          refundStatus: refund.status,
          refundProvider: "stripe",
          updatedAt: FieldValue.serverTimestamp(),
        })

      return NextResponse.json({
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        provider: "stripe",
      })
    }
  } catch (error: any) {
    console.error("Error processing refund:", error)
    return NextResponse.json({ error: error.message || "Failed to process refund" }, { status: 500 })
  }
}
