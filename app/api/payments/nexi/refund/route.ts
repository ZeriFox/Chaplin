import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { refundOperation, findPaymentOperation } from "@/lib/nexi-client"

/**
 * Refund a Nexi payment
 * POST /api/payments/nexi/refund
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXI_API_KEY) {
      return NextResponse.json(
        { error: "Nexi non è configurato. Contatta il supporto." },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { bookingId, amount, reason } = body

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "Parametri mancanti: bookingId, amount" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()

    if (booking?.paymentProvider !== "nexi") {
      return NextResponse.json(
        { error: "Questa prenotazione non è stata pagata con Nexi" },
        { status: 400 },
      )
    }

    const nexiOrderId = booking?.nexiOrderId
    if (!nexiOrderId) {
      return NextResponse.json(
        { error: "ID ordine Nexi non trovato per questa prenotazione" },
        { status: 400 },
      )
    }

    // Find the payment operation ID for the refund
    let operationId = booking?.nexiOperationId

    if (!operationId) {
      console.log("[Nexi Refund] No operationId stored, looking up from order status...")
      const payOp = await findPaymentOperation(nexiOrderId)
      if (!payOp) {
        return NextResponse.json(
          { error: "Operazione di pagamento non trovata su Nexi" },
          { status: 400 },
        )
      }
      operationId = payOp.operationId
    }

    console.log("[Nexi Refund] Processing refund:", {
      bookingId,
      operationId,
      amount,
      reason,
    })

    // Process the refund
    const refundResult = await refundOperation(
      operationId,
      amount,
      "EUR",
      reason || `Rimborso prenotazione #${bookingId}`,
    )

    // Update the booking record
    await bookingRef.update({
      refundedAt: FieldValue.serverTimestamp(),
      refundAmount: amount / 100, // Store in EUR
      nexiRefundOperationId: refundResult.operationId,
      nexiRefundResult: refundResult.operationResult,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("[Nexi Refund] Refund completed successfully:", refundResult)

    return NextResponse.json({
      success: true,
      refundOperationId: refundResult.operationId,
      refundResult: refundResult.operationResult,
    })
  } catch (error: any) {
    console.error("[Nexi Refund] Error:", error)

    return NextResponse.json(
      { error: error.message || "Errore durante il rimborso Nexi" },
      { status: 500 },
    )
  }
}
