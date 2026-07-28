import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { getOrderStatus } from "@/lib/nexi-client"

/**
 * Nexi XPay callback / server-to-server notification
 * Called by Nexi when payment is completed or fails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[Nexi Callback] Received notification:", JSON.stringify(body, null, 2))

    const { orderId, operationId, operationResult } = body

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    // Extract bookingId from orderId format: CHAP-{bookingId}-{timestamp}
    const parts = orderId.split("-")
    const bookingId = parts.length >= 2 ? parts[1] : null

    if (!bookingId) {
      console.error("[Nexi Callback] Could not extract bookingId from orderId:", orderId)
      return NextResponse.json({ error: "Invalid orderId format" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      console.error("[Nexi Callback] Booking not found:", bookingId)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Verify the payment status with Nexi
    let verifiedResult = operationResult
    try {
      const orderStatus = await getOrderStatus(orderId)
      verifiedResult = orderStatus.orderStatus?.result || operationResult
      console.log("[Nexi Callback] Verified order status:", verifiedResult)
    } catch (verifyError) {
      console.error("[Nexi Callback] Could not verify order status, using callback result:", verifyError)
    }

    const isSuccess = verifiedResult === "AUTHORIZED" || verifiedResult === "EXECUTED" || verifiedResult === "PENDING"

    if (isSuccess) {
      console.log("[Nexi Callback] Payment successful for booking:", bookingId)

      await bookingRef.update({
        status: "paid",
        paymentProvider: "nexi",
        nexiOrderId: orderId,
        nexiOperationId: operationId || null,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Send confirmation email via existing endpoint
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"
        await fetch(`${siteUrl}/api/resend-booking-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        })
        console.log("[Nexi Callback] Confirmation email sent")
      } catch (emailError) {
        console.error("[Nexi Callback] Error sending confirmation email:", emailError)
      }

      // Notify admin
      try {
        const booking = bookingSnap.data()
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"
        await fetch(`${siteUrl}/api/bookings/notify-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            roomName: booking?.roomName,
            checkIn: booking?.checkIn,
            checkOut: booking?.checkOut,
            guestName: `${booking?.firstName} ${booking?.lastName}`,
          }),
        })
      } catch (notifyError) {
        console.error("[Nexi Callback] Error notifying admin:", notifyError)
      }
    } else {
      console.log("[Nexi Callback] Payment failed/declined for booking:", bookingId, "Result:", verifiedResult)

      await bookingRef.update({
        nexiOrderId: orderId,
        nexiPaymentResult: verifiedResult,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Nexi Callback] Error processing callback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

/**
 * GET handler for Nexi redirect returns
 * When Nexi redirects the user back after payment
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")
  const result = searchParams.get("result")

  console.log("[Nexi Callback] GET redirect received:", { orderId, result })

  // Redirect to success page or checkout
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"

  if (orderId) {
    // Extract bookingId
    const parts = orderId.split("-")
    const bookingId = parts.length >= 2 ? parts[1] : ""
    return NextResponse.redirect(`${siteUrl}/checkout/success?bookingId=${bookingId}&nexiOrderId=${orderId}`)
  }

  return NextResponse.redirect(`${siteUrl}/checkout`)
}
