import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendCancellationEmail } from "@/lib/email"
import { calculateCancellationPolicy } from "@/lib/payment-logic"
import { cancelBookingWithInventory } from "@/lib/booking-inventory"

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

export async function DELETE(request: NextRequest) {
  try {
    const { bookingId, userId } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "ID prenotazione mancante" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    // Verify user owns this booking
    if (userId && booking?.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    const checkInDate = new Date(booking?.checkIn || "")
    const today = new Date()
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Check if booking can be cancelled (not in the past)
    if (daysUntilCheckIn < 0) {
      return NextResponse.json({ error: "Non puoi cancellare prenotazioni passate" }, { status: 400 })
    }

    const cancellationPolicy = calculateCancellationPolicy(
      checkInDate,
      Number.parseFloat(booking?.totalAmount?.toFixed(2) || "0"),
      today,
    )

    const refundAmount = Number.parseFloat(cancellationPolicy.refundAmount.toFixed(2))
    const penalty = Number.parseFloat(cancellationPolicy.penaltyAmount.toFixed(2))
    const isFullRefund = cancellationPolicy.refundPercentage === 100

    const paymentProvider = booking?.paymentProvider || "stripe"
    console.log(`[API] Booking cancelled via ${paymentProvider} - refund: €${refundAmount} (${cancellationPolicy.refundPercentage}%)`)

    await cancelBookingWithInventory({
      bookingRef,
      cancellationData: {
        cancelledAt: FieldValue.serverTimestamp(),
        refundAmount,
        penalty,
        refundPercentage: cancellationPolicy.refundPercentage,
        penaltyPercentage: cancellationPolicy.penaltyPercentage,
        cancellationReason: isFullRefund ? "full_refund" : "late_cancellation",
        ...(refundAmount > 0
          ? {
              pendingRefund: {
                amount: refundAmount,
                reason: "booking_cancelled",
                requestedAt: FieldValue.serverTimestamp(),
                status: "pending_manual_processing",
                provider: paymentProvider,
              },
            }
          : {}),
      },
    })

    /* SMOOBU DISABLED - Unblocking dates now handled via Firebase only
    if (booking?.origin === "site" && booking?.roomId && booking?.checkIn && booking?.checkOut) {
      try {
        console.log("[Smoobu] Unblocking dates for cancelled booking")
        const unblockResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"}/api/smoobu/unblock-booking-dates`,
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: booking.roomId, checkIn: booking.checkIn, checkOut: booking.checkOut }) })
        if (unblockResponse.ok) console.log("[Smoobu] Dates unblocked successfully")
      } catch (error) {
        console.error("[Smoobu] Error unblocking dates:", error)
      }
    }
    */

    try {
      await sendCancellationEmail({
        to: booking?.email || "",
        bookingId,
        firstName: booking?.firstName || "",
        lastName: booking?.lastName || "",
        roomName: booking?.roomName || "",
        checkIn: booking?.checkIn || "",
        checkOut: booking?.checkOut || "",
        guests: booking?.guests || 1,
        originalAmount: booking?.totalAmount || 0,
        refundAmount,
        penalty,
        isFullRefund,
        manualRefund: true,
      })
      console.log("[API] ✅ Cancellation email sent successfully to guest")
    } catch (error) {
      console.error("[API] ❌ Error sending cancellation email to guest:", error)
    }

    try {
      const managementEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "info@al22suite.com"
      await sendCancellationEmail({
        to: managementEmail,
        bookingId,
        firstName: booking?.firstName || "",
        lastName: booking?.lastName || "",
        roomName: booking?.roomName || "",
        checkIn: booking?.checkIn || "",
        checkOut: booking?.checkOut || "",
        guests: booking?.guests || 1,
        originalAmount: booking?.totalAmount || 0,
        refundAmount,
        penalty,
        isFullRefund,
        manualRefund: true,
      })
      console.log("[API] ✅ Cancellation notification sent to management:", managementEmail)
    } catch (error) {
      console.error("[API] ❌ Error sending cancellation notification to management:", error)
    }

    console.log("[API] Booking cancelled successfully:", bookingId)

    return NextResponse.json({
      success: true,
      refundAmount,
      penalty,
      refundPercentage: cancellationPolicy.refundPercentage,
      penaltyPercentage: cancellationPolicy.penaltyPercentage,
      isFullRefund,
      paymentProvider,
      message:
        refundAmount > 0
          ? `Prenotazione cancellata. Il rimborso di €${refundAmount.toFixed(2)} verrà elaborato tramite ${paymentProvider === "nexi" ? "Nexi" : "Stripe"} entro 5-10 giorni lavorativi.`
          : "Prenotazione cancellata. Nessun rimborso previsto (cancellazione entro 7 giorni dal check-in).",
    })
  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: "Errore nella cancellazione" }, { status: 500 })
  }
}
