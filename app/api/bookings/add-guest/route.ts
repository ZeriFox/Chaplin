import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights } from "@/lib/pricing"

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

export async function PUT(request: NextRequest) {
  try {
    const { bookingId, newAdults, newChildren, priceDifference } = await request.json()

    console.log("[v0] Add guest request:", { bookingId, newAdults, newChildren, priceDifference })

    if (!bookingId || (newAdults === undefined && newChildren === undefined) || priceDifference === undefined) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
    }

    const booking = bookingSnap.data()
    const currentGuests = booking?.guests || 1
    const currentChildren = booking?.numberOfChildren || 0
    const maxGuests = 4

    const newGuestsCount = (newAdults || currentGuests) + (newChildren || currentChildren)

    console.log("[v0] Current:", { guests: currentGuests, children: currentChildren })
    console.log("[v0] New:", { adults: newAdults, children: newChildren, total: newGuestsCount })

    if (newGuestsCount > maxGuests) {
      return NextResponse.json({ error: "Numero massimo di ospiti (4) raggiunto" }, { status: 400 })
    }

    if ((newAdults || currentGuests) < 1) {
      return NextResponse.json({ error: "È richiesto almeno un adulto" }, { status: 400 })
    }

    const originalAmount = Number.parseFloat(booking?.totalAmount?.toFixed(2) || "0")
    const priceDiff = Number.parseFloat(priceDifference.toFixed(2))
    const newTotalAmount = Number.parseFloat((originalAmount + priceDiff).toFixed(2))

    if (priceDiff > 0) {
      const stripe = getStripe()
      if (!stripe) {
        return NextResponse.json({ error: "Sistema di pagamento non configurato" }, { status: 500 })
      }
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Aggiunta Ospiti - ${booking?.roomName || "Camera"}`,
                description: `Da ${currentGuests} a ${newGuestsCount} ospiti`,
              },
              unit_amount: Math.round(priceDiff * 100), // Convert EUR to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/user/booking/${bookingId}?payment=cancelled`,
        metadata: {
          bookingId,
          type: "add_guest",
          newAdults: (newAdults || currentGuests).toString(),
          newChildren: (newChildren || currentChildren).toString(),
          newTotalAmount: newTotalAmount.toString(),
          originalAmount: originalAmount.toString(),
          guestAdditionCost: priceDiff.toString(),
        },
      })

      return NextResponse.json({
        success: true,
        paymentUrl: session.url,
      })
    }

    await bookingRef.update({
      guests: newAdults || currentGuests,
      numberOfChildren: newChildren || currentChildren,
      totalAmount: newTotalAmount,
      totalPaid: newTotalAmount, // Full payment already made
      updatedAt: FieldValue.serverTimestamp(),
    })

    const nights = calculateNights(booking?.checkIn, booking?.checkOut)
    await sendModificationEmail({
      to: booking?.email,
      bookingId,
      firstName: booking?.firstName,
      lastName: booking?.lastName,
      checkIn: booking?.checkIn,
      checkOut: booking?.checkOut,
      roomName: booking?.roomName,
      guests: newAdults || currentGuests,
      children: newChildren || currentChildren,
      nights,
      originalAmount,
      newAmount: newTotalAmount,
      guestAdditionCost: priceDiff,
      modificationType: "guests",
    })

    console.log("[API] Guests added successfully:", bookingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding guest:", error)
    return NextResponse.json({ error: "Errore nell'aggiunta dell'ospite" }, { status: 500 })
  }
}

