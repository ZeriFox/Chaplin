import { NextResponse } from "next/server"
import { getFirestore } from "@/lib/firebase-admin"

export async function POST(req: Request) {
  try {
    const { bookingId, sessionId } = await req.json()

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 })
    }

    const db = getFirestore()
    const bookingRef = db.doc(`bookings/${bookingId}`)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const bookingData = bookingSnap.data() as any

    console.log("[Test Webhook] Simulating webhook for booking:", bookingId)
    console.log("[Test Webhook] Current booking data:", bookingData)

    // Per ora, simuliamo che il webhook abbia aggiornato correttamente
    // Nota: in un vero webhook, questi dati verrebbero dal session metadata
    return NextResponse.json({
      success: true,
      message: "In produzione, verifica i log del webhook Stripe su Vercel",
      bookingId,
      currentData: {
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        totalAmount: bookingData.totalAmount / 100,
        depositPaid: bookingData.depositPaid / 100,
        balanceDue: bookingData.balanceDue / 100,
      },
    })
  } catch (error: any) {
    console.error("[Test Webhook Error]:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

