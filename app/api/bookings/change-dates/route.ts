import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { sendModificationEmail } from "@/lib/email"
import { calculateNights, calculateDaysUntilCheckIn, calculateChangeDatesPenalty } from "@/lib/pricing"
import { createHPPOrder, isNexiConfigured } from "@/lib/nexi-client"

// Stripe + Nexi dual-gateway support for change-dates payments
// Lazy Stripe init - wrapped in closure to avoid build-time evaluation
const getStripe = (() => {
  let instance: Stripe | null = null
  return (): Stripe | null => {
    if (!instance && process.env.STRIPE_SECRET_KEY) {
      instance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" })
    }
    return instance
  }
})()



function isDateInRecurringSeason(date: Date, startMMDD: string, endMMDD: string): boolean {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const dateMMDD = `${month}-${day}`

  if (startMMDD > endMMDD) {
    return dateMMDD >= startMMDD || dateMMDD <= endMMDD
  }

  return dateMMDD >= startMMDD && dateMMDD <= endMMDD
}

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0 DEBUG] ====== CHANGE DATES REQUEST START ======")
    console.log("[v0 DEBUG] Environment:", process.env.NODE_ENV)
    console.log("[v0 DEBUG] NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[v0 DEBUG] ❌ STRIPE_SECRET_KEY is missing!")
      return NextResponse.json({ error: "Server configuration error: Missing Stripe key" }, { status: 500 })
    }

    const { bookingId, checkIn, checkOut, userId } = await request.json()

    console.log("[v0 DEBUG] Input:", { bookingId, checkIn, checkOut })

    if (!bookingId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    // Validate dates
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkInDate < today) {
      return NextResponse.json({ error: "La data di check-in non può essere nel passato" }, { status: 400 })
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: "Il check-out deve essere dopo il check-in" }, { status: 400 })
    }

    console.log("[v0 DEBUG] 📦 Getting Firebase DB...")
    let db, bookingRef, bookingSnap, bookingData
    try {
      db = getAdminDb()
      bookingRef = db.collection("bookings").doc(bookingId)
      bookingSnap = await bookingRef.get()

      if (!bookingSnap.exists) {
        return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
      }

      bookingData = bookingSnap.data()
      console.log("[v0 DEBUG] ✅ Booking data retrieved:", {
        id: bookingId,
        roomId: bookingData?.roomId,
        originalCheckIn: bookingData?.checkIn,
        originalCheckOut: bookingData?.checkOut,
        totalAmount: bookingData?.totalAmount,
        adults: bookingData?.adults,
        numberOfChildren: bookingData?.numberOfChildren,
      })
    } catch (firebaseError: any) {
      console.error("[v0 DEBUG] ❌ Firebase Error:", firebaseError)
      console.error("[v0 DEBUG] Error details:", {
        message: firebaseError.message,
        stack: firebaseError.stack,
        code: firebaseError.code,
      })
      return NextResponse.json(
        {
          error: "Database error",
          details: firebaseError.message,
        },
        { status: 500 },
      )
    }

    // Verify user owns this booking
    if (userId && bookingData?.userId !== userId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }

    console.log("[v0 DEBUG] 💰 Calculating new price directly...")
    let newPrice
    try {
      const roomId = bookingData?.roomId
      const nights = calculateNights(checkIn, checkOut)

      // Get room base price
      const roomRef = db.collection("rooms").doc(roomId)
      const roomSnap = await roomRef.get()

      if (!roomSnap.exists) {
        throw new Error("Camera non trovata")
      }

      const basePrice = roomSnap.data()?.price || 0

      // Get pricing rules
      const seasonsSnapshot = await db.collection("pricing_seasons").get()
      const seasons = seasonsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      const periodsSnapshot = await db.collection("pricing_special_periods").get()
      const specialPeriods = periodsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      const overridesSnapshot = await db.collection("pricing_overrides").where("roomId", "==", roomId).get()
      const overrides = overridesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Calculate price for each night
      let roomTotalPrice = 0
      const currentDate = new Date(checkInDate)

      while (currentDate < checkOutDate) {
        const dateStr = currentDate.toISOString().split("T")[0]

        // Check override first (highest priority)
        const override = overrides.find((o: any) => o.date === dateStr)
        if (override) {
          roomTotalPrice += override.price
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        // Check special period (second priority)
        const specialPeriod = specialPeriods.find((p: any) => {
          const pStart = p.startDate.split("T")[0]
          const pEnd = p.endDate.split("T")[0]
          return dateStr >= pStart && dateStr <= pEnd
        })

        if (specialPeriod) {
          roomTotalPrice += Math.round(basePrice * specialPeriod.priceMultiplier)
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        // Check season (third priority)
        const season = seasons.find((s: any) => {
          return isDateInRecurringSeason(currentDate, s.startDate, s.endDate)
        })

        if (season) {
          roomTotalPrice += Math.round(basePrice * season.priceMultiplier)
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        // Base price (lowest priority)
        roomTotalPrice += basePrice
        currentDate.setDate(currentDate.getDate() + 1)
      }

      const adults = bookingData?.adults || 2
      const children = bookingData?.numberOfChildren || 0
      const totalGuests = adults + children

      let extraGuestsCost = 0
      if (totalGuests > 2) {
        const extraAdults = Math.max(0, adults - 2)
        const extraChildren = totalGuests > 2 && adults <= 2 ? children : children

        extraGuestsCost = (extraAdults * 60 + extraChildren * 48) * nights
      }

      newPrice = roomTotalPrice + extraGuestsCost

      console.log("[v0 DEBUG] ✅ Price calculated:", {
        roomPrice: roomTotalPrice,
        nights,
        adults,
        children,
        extraGuestsCost,
        totalPrice: newPrice,
      })
    } catch (priceError: any) {
      console.error("[v0 DEBUG] ❌ Price Calculation Error:", priceError)
      console.error("[v0 DEBUG] Error details:", {
        message: priceError.message,
        stack: priceError.stack,
      })
      return NextResponse.json(
        {
          error: "Failed to calculate price",
          details: priceError.message,
        },
        { status: 500 },
      )
    }

    const basePrice = Number.parseFloat(newPrice.toFixed(2))
    const penaltyAmount = Number.parseFloat(
      calculateChangeDatesPenalty(
        Number.parseFloat(bookingData?.totalAmount?.toFixed(2) || "0"),
        calculateDaysUntilCheckIn(bookingData?.checkIn),
      ).toFixed(2),
    )
    const totalAmount = Number.parseFloat((basePrice + penaltyAmount).toFixed(2))

    const originalAmount = Number.parseFloat(bookingData?.totalAmount?.toFixed(2) || "0")
    const priceDifference = Number.parseFloat((totalAmount - originalAmount).toFixed(2))

    console.log("[v0] Price calculation:", {
      basePrice,
      penaltyAmount,
      totalAmount,
      originalAmount,
      priceDifference,
      daysUntilCheckIn: calculateDaysUntilCheckIn(bookingData?.checkIn),
    })

    if (priceDifference > 0) {
      const paymentAmount = priceDifference
      const paymentProvider = bookingData?.paymentProvider || "stripe"

      console.log(`[v0] Price increased, creating ${paymentProvider} checkout for difference: €${paymentAmount}`)

      const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://al22suite.com"
      const successUrl = `${baseUrl}/user/booking/${bookingId}?payment=processing`
      const cancelUrl = `${baseUrl}/user/booking/${bookingId}?payment=cancelled`

      try {
        let paymentUrl: string | null = null

        if (paymentProvider === "nexi") {
          // --- NEXI PAYMENT ---
          if (!isNexiConfigured()) {
            return NextResponse.json(
              { error: "Nexi non configurato. Contatta il supporto." },
              { status: 500 },
            )
          }
          const nexiOrder = await createHPPOrder({
            bookingId: `CHANGE-${bookingId}`,
            amount: Math.round(paymentAmount * 100),
            currency: "EUR",
            description: `Modifica date - ${bookingData?.roomName || "Camera"} (${checkIn} - ${checkOut})`,
            customerEmail: bookingData?.email,
            successUrl: `${baseUrl}/api/payments/nexi/callback`,
            cancelUrl,
            callbackUrl: `${baseUrl}/api/payments/nexi/callback`,
          })
          paymentUrl = nexiOrder.hostedPage
        } else {
          // --- STRIPE PAYMENT ---
          const stripe = getStripe()
          if (!stripe) {
            return NextResponse.json(
              { error: "Stripe non configurato. Contatta il supporto." },
              { status: 500 },
            )
          }
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            client_reference_id: bookingId,
            line_items: [
              {
                price_data: {
                  currency: "eur",
                  product_data: {
                    name: `Pagamento Modifica Date - ${bookingData?.roomName || "Camera"}`,
                    description: `Nuove date: ${checkIn} - ${checkOut}${penaltyAmount > 0 ? ` (include penale €${penaltyAmount.toFixed(2)})` : ""}\nDifferenza prezzo da pagare`,
                  },
                  unit_amount: Math.round(paymentAmount * 100),
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
              bookingId,
              type: "change_dates",
              checkIn,
              checkOut,
              newTotalAmount: totalAmount.toString(),
              penalty: penaltyAmount.toString(),
              originalAmount: originalAmount.toString(),
              priceDifference: priceDifference.toString(),
              paymentAmount: paymentAmount.toString(),
            },
          })
          paymentUrl = session.url
        }

        return NextResponse.json({
          success: true,
          paymentRequired: true,
          paymentUrl,
          paymentAmount,
          newTotalAmount: totalAmount,
          basePrice,
          penaltyAmount,
          originalAmount,
          paymentProvider,
          message: `Differenza di prezzo da pagare: €${paymentAmount.toFixed(2)}`,
          instructions: "Dopo il pagamento, riceverai un'email di conferma con i nuovi dettagli della prenotazione",
        })
      } catch (paymentError: any) {
        console.error(`[v0] ${paymentProvider} Checkout Error:`, paymentError)
        return NextResponse.json(
          { error: "Failed to create payment session", details: paymentError.message },
          { status: 500 },
        )
      }
    }

    if (priceDifference < 0) {
      const refundAmount = Math.abs(priceDifference)
      const paymentProvider = bookingData?.paymentProvider || "stripe"

      console.log(`[v0] Price decreased - refund via ${paymentProvider}: €${refundAmount}`)

      await bookingRef.update({
        checkIn,
        checkOut,
        nights: calculateNights(checkIn, checkOut),
        totalAmount,
        totalPaid: originalAmount,
        pendingRefund: {
          amount: refundAmount,
          reason: "date_change_price_decrease",
          requestedAt: FieldValue.serverTimestamp(),
          status: "pending_manual_processing",
          provider: paymentProvider,
        },
        updatedAt: FieldValue.serverTimestamp(),
      })

      await sendModificationEmail({
        to: bookingData?.email,
        bookingId,
        firstName: bookingData?.firstName,
        lastName: bookingData?.lastName,
        checkIn,
        checkOut,
        roomName: bookingData?.roomName,
        guests: bookingData?.guests || 2,
        nights: calculateNights(checkIn, checkOut),
        originalAmount,
        newAmount: totalAmount,
        penalty: penaltyAmount,
        dateChangeCost: priceDifference,
        modificationType: "dates",
        refundAmount,
        manualRefund: true,
      })

      console.log(`[API] Booking dates changed - refund via ${paymentProvider}:`, bookingId)

      return NextResponse.json({
        success: true,
        nights: calculateNights(checkIn, checkOut),
        totalAmount,
        priceDifference,
        basePrice,
        penaltyAmount,
        originalAmount,
        paymentAmount: 0,
        newTotalAmount: totalAmount,
        refundPending: true,
        refundAmount,
        paymentProvider,
        message: `Date modificate. Rimborso di €${refundAmount.toFixed(2)} verrà elaborato tramite ${paymentProvider === "nexi" ? "Nexi" : "Stripe"} entro 5-10 giorni lavorativi.`,
      })
    }

    await bookingRef.update({
      checkIn,
      checkOut,
      nights: calculateNights(checkIn, checkOut),
      totalAmount,
      totalPaid: totalAmount,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await sendModificationEmail({
      to: bookingData?.email,
      bookingId,
      firstName: bookingData?.firstName,
      lastName: bookingData?.lastName,
      checkIn,
      checkOut,
      roomName: bookingData?.roomName,
      guests: bookingData?.guests || 2,
      nights: calculateNights(checkIn, checkOut),
      originalAmount,
      newAmount: totalAmount,
      penalty: penaltyAmount,
      dateChangeCost: priceDifference,
      modificationType: "dates",
    })

    console.log("[API] Booking dates changed successfully:", bookingId)

    return NextResponse.json({
      success: true,
      nights: calculateNights(checkIn, checkOut),
      totalAmount,
      priceDifference,
      basePrice,
      penaltyAmount,
      originalAmount,
      paymentAmount: 0,
      newTotalAmount: totalAmount,
      message: "Date modificate con successo",
    })
  } catch (error: any) {
    console.error("[v0 DEBUG] ❌❌❌ FATAL ERROR in change-dates ❌❌❌")
    console.error("[v0 DEBUG] Error type:", error.constructor.name)
    console.error("[v0 DEBUG] Error message:", error.message)
    console.error("[v0 DEBUG] Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Errore nella modifica delle date",
        details: error.message,
        type: error.constructor.name,
      },
      { status: 500 },
    )
  }
}
