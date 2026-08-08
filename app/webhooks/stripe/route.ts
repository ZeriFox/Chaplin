import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { admin, getFirestore } from "@/lib/firebase-admin"
import { sendBookingConfirmationEmail, sendModificationEmail } from "@/lib/email"

export const dynamic = "force-dynamic"

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
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

async function alreadyProcessed(eventId: string) {
  const db = getFirestore()
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  const snap = await ref.get()
  return snap.exists
}
async function markProcessed(eventId: string, payload: any) {
  const db = getFirestore()
  const ref = db.doc(`stripe_webhook_events/${eventId}`)
  await ref.set({ receivedAt: admin.firestore.FieldValue.serverTimestamp(), payload }, { merge: true })
}

export async function POST(req: NextRequest) {
  console.log("[v0 WEBHOOK] 🚀 Webhook POST called at:", new Date().toISOString())
  console.log("[v0 WEBHOOK] Request URL:", req.url)
  console.log("[v0 WEBHOOK] Request method:", req.method)

  try {
    const rawBody = await req.text()
    console.log("[v0 WEBHOOK] Body length:", rawBody.length)

    const signature = req.headers.get("stripe-signature")
    console.log("[v0 WEBHOOK] Signature present:", !!signature)

    if (!signature) {
      console.error("[Webhook] No signature provided")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Verifica firma
    const stripe = getStripe()
    if (!stripe) {
      console.error("[Webhook] Stripe not configured")
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }
    
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      console.log("[v0 WEBHOOK] ✅ Signature verified successfully")
    } catch (err: any) {
      console.error("[Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log("[Webhook] Event received:", event.type, "ID:", event.id)

    // Evita doppi processamenti
    if (await alreadyProcessed(event.id)) {
      console.log("[Webhook] Event already processed:", event.id)
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (event.type === "checkout.session.completed") {
      const db = getFirestore()
      const session = event.data.object as Stripe.Checkout.Session

      const bookingId = session.metadata?.bookingId || session.client_reference_id || null
      const customerEmail = session.customer_email || session.customer_details?.email || session.metadata?.email || ""

      console.log("[Webhook] checkout.session.completed", {
        livemode: event.livemode,
        bookingId,
        email: customerEmail,
        payment_status: session.payment_status,
      })

      if (!bookingId) {
        console.error("[Webhook] Missing bookingId (metadata/client_reference_id)")
        await markProcessed(event.id, { error: "no bookingId" })
        return NextResponse.json({ error: "Missing bookingId" }, { status: 400 })
      }

      if (session.payment_status !== "paid") {
        console.log("[Webhook] Payment not completed:", session.payment_status)
        await markProcessed(event.id, { status: session.payment_status })
        return NextResponse.json({ received: true, status: "payment_not_paid" })
      }

      const bookingRef = db.doc(`bookings/${bookingId}`)
      const bookingSnap = await bookingRef.get()
      if (!bookingSnap.exists) {
        console.error("[Webhook] Booking not found:", bookingId)
        await markProcessed(event.id, { error: "booking_not_found" })
        return NextResponse.json({ error: "Booking not found" }, { status: 404 })
      }

      const bookingData = bookingSnap.data() as any
      console.log("[Webhook] Booking found:", bookingId, "Email:", bookingData.email)

      const paymentType = session.metadata?.type || session.metadata?.paymentType || "full"

      if (paymentType === "change_dates") {
        console.log("[Webhook] Processing change_dates payment")
        console.log("[Webhook] Session metadata:", session.metadata)

        const newTotalAmount = Number.parseFloat(session.metadata?.newTotalAmount || "0")
        const paymentAmount = Number.parseFloat(session.metadata?.paymentAmount || "0")
        const checkIn = session.metadata?.checkIn
        const checkOut = session.metadata?.checkOut
        const penalty = Number.parseFloat(session.metadata?.penalty || "0")

        console.log("[Webhook] Parsed metadata:", {
          newTotalAmount: newTotalAmount.toFixed(2),
          paymentAmount: paymentAmount.toFixed(2),
          penalty: penalty.toFixed(2),
          checkIn,
          checkOut,
        })

        const currentTotalPaid = bookingData.totalPaid || bookingData.totalAmount || 0

        console.log("[Webhook] Current booking state:", {
          currentTotalPaid: currentTotalPaid.toFixed(2),
          currentTotalAmount: bookingData.totalAmount.toFixed(2),
        })

        const updateData = {
          checkIn,
          checkOut,
          totalAmount: Number.parseFloat(newTotalAmount.toFixed(2)),
          totalPaid: Number.parseFloat(newTotalAmount.toFixed(2)), // Full amount is paid after this payment
          status: "paid",
          lastPayment: {
            type: "change_dates_payment",
            amount: Number.parseFloat(paymentAmount.toFixed(2)),
            paymentId: String(session.payment_intent || session.id),
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }

        console.log("[Webhook] Updating booking with:", {
          newTotalPaid: updateData.totalPaid.toFixed(2),
          newTotalAmount: updateData.totalAmount.toFixed(2),
          newCheckIn: updateData.checkIn,
          newCheckOut: updateData.checkOut,
        })

        await bookingRef.update(updateData)

        console.log("[Webhook] Database updated successfully")

        try {
          const nights = Math.ceil(
            (new Date(checkOut || bookingData.checkOut).getTime() -
              new Date(checkIn || bookingData.checkIn).getTime()) /
              (1000 * 60 * 60 * 24),
          )

          console.log("[Webhook] Sending date change confirmation email")
          await sendModificationEmail({
            to: bookingData.email,
            bookingId: bookingId,
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            checkIn: checkIn || bookingData.checkIn,
            checkOut: checkOut || bookingData.checkOut,
            roomName: bookingData.roomName,
            guests: bookingData.guests,
            nights,
            originalAmount: bookingData.totalAmount,
            newAmount: newTotalAmount,
            penalty: penalty > 0 ? penalty : undefined,
            dateChangeCost: paymentAmount,
            modificationType: "dates",
          })
          console.log("[Webhook] Date change confirmation email sent successfully")
        } catch (emailError: any) {
          console.error("[Webhook] Error sending date change email:", emailError.message)
        }

        await markProcessed(event.id, { ok: true, bookingId, type: "change_dates" })
        return NextResponse.json({ received: true, bookingId, type: "change_dates" })
      }

      // Default: full payment for new booking
      const paidAmount = session.amount_total || 0
      const fullAmount = session.metadata?.fullAmount
        ? Number.parseInt(session.metadata.fullAmount)
        : bookingData.totalAmount

      await bookingRef.update({
        status: "paid",
        paymentId: String(session.payment_intent || session.id),
        paymentProvider: "stripe",
        paymentType: "full",
        totalPaid: Number.parseFloat((paidAmount / 100).toFixed(2)),
        totalAmount: Number.parseFloat((fullAmount / 100).toFixed(2)),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log("[Webhook] Full payment processed:", {
        totalPaid: (paidAmount / 100).toFixed(2),
        totalAmount: (fullAmount / 100).toFixed(2),
      })

      // crea/collega utente
      let uid = ""
      let newPassword: string | undefined
      try {
        console.log("[Webhook] Checking if user exists:", bookingData.email)
        const user = await admin.auth().getUserByEmail(bookingData.email)
        uid = user.uid
        console.log("[Webhook] User already exists:", uid)
      } catch (userError: any) {
        console.log("[Webhook] User not found, creating new user:", bookingData.email)

        const generatePassword = () => {
          const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
          let password = ""
          for (let i = 0; i < 12; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length))
          }
          return password
        }

        newPassword = generatePassword()
        console.log("[Webhook] Generated password for new user")

        try {
          const newUser = await admin.auth().createUser({
            email: bookingData.email,
            password: newPassword,
            displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
          })
          uid = newUser.uid
          console.log("[Webhook] User created in Firebase Auth:", uid)

          await db.doc(`users/${uid}`).set({
            uid: uid,
            email: bookingData.email,
            displayName: `${bookingData.firstName} ${bookingData.lastName}`.trim(),
            firstName: bookingData.firstName,
            lastName: bookingData.lastName,
            provider: "password",
            role: "user",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            notifications: {
              confirmEmails: true,
              promos: false,
              checkinReminders: true,
            },
          })
          console.log("[Webhook] User data saved in Firestore")
        } catch (createError: any) {
          console.error("[Webhook] Error creating user:", createError.message, createError.code)
          throw createError
        }
      }

      await bookingRef.update({
        userId: uid,
        newUserPassword: newPassword || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log("[Webhook] Booking updated with userId:", uid)
      console.log("[Webhook] New user password saved:", !!newPassword)
      if (newPassword) {
        console.log("[Webhook] Password length:", newPassword.length)
      }

      const updatedBookingSnap = await bookingRef.get()
      const updatedBookingData = updatedBookingSnap.data() as any
      console.log("[Webhook] Reloaded booking data, has newUserPassword:", !!updatedBookingData.newUserPassword)

      try {
        console.log("[Webhook] Attempting to send confirmation email to:", updatedBookingData.email)
        console.log("[Webhook] Email data:", {
          bookingId,
          firstName: updatedBookingData.firstName,
          lastName: updatedBookingData.lastName,
          hasNewPassword: !!newPassword,
          passwordLength: newPassword?.length,
        })

        const emailResult = await sendBookingConfirmationEmail({
          to: updatedBookingData.email,
          bookingId: bookingId,
          firstName: updatedBookingData.firstName,
          lastName: updatedBookingData.lastName,
          checkIn: updatedBookingData.checkIn,
          checkOut: updatedBookingData.checkOut,
          roomName: updatedBookingData.roomName,
          guests: updatedBookingData.guests,
          numberOfChildren: updatedBookingData.numberOfChildren || 0,
          totalAmount: updatedBookingData.totalAmount,
          nights: updatedBookingData.nights,
          newUserPassword: newPassword,
        })
        console.log("[Webhook] Email send result:", emailResult)
        if (emailResult.success) {
          console.log("[Webhook] ✅ Confirmation email sent successfully")
        } else {
          console.error("[Webhook] ❌ Email send failed:", emailResult.error)
        }
      } catch (emailError: any) {
        console.error("[Webhook] ❌ Email send error:", emailError.message)
        console.error("[Webhook] Email error details:", emailError)
      }

      await markProcessed(event.id, { ok: true, bookingId, userCreated: !!newPassword })
      console.log("[Webhook] ✅ Webhook processing completed successfully")
      return NextResponse.json({ received: true, bookingId, userCreated: !!newPassword })
    }

    console.log("[Webhook] Event type not handled:", event.type)
    await markProcessed(event.id, { ignored: event.type })
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[Webhook Handler Error]:", error.message)
    console.error("[Webhook Handler Error Stack]:", error.stack)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
