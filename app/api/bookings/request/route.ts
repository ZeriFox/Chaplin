import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { Resend } from "resend"
import { getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"

const STRUCTURE_EMAIL = "chaplinviterbo@gmail.com"
const MAX_TEXT_LENGTH = 2_000

type BookingRequestBody = {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  children?: number
  roomType?: string
  roomName?: string
  roomId?: string
  nights?: number
  pricePerNight?: number
  subtotal?: number
  taxes?: number
  serviceFee?: number
  totalAmount?: number
  specialRequests?: string
}

function cleanText(value: unknown, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength)
}

function escapeHtml(value: unknown) {
  return cleanText(value, MAX_TEXT_LENGTH).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function getErrorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL

    if (!apiKey || !fromEmail) {
      return NextResponse.json({ error: "Servizio email non configurato" }, { status: 503 })
    }

    const body = (await request.json()) as BookingRequestBody
    const firstName = cleanText(body.firstName)
    const lastName = cleanText(body.lastName)
    const email = cleanText(body.email).toLowerCase()
    const phone = cleanText(body.phone, 50)
    const checkIn = cleanText(body.checkIn, 10)
    const checkOut = cleanText(body.checkOut, 10)
    const roomId = cleanText(body.roomId, 100)
    const roomType = cleanText(body.roomType, 100)
    const roomName = cleanText(body.roomName, 200) || "Suite con SPA"
    const specialRequests = cleanText(body.specialRequests, MAX_TEXT_LENGTH)
    const guests = Math.max(1, Math.min(2, Number(body.guests) || 1))
    const children = Math.max(0, Number(body.children) || 0)
    const pricePerNight = Math.max(0, Math.round(Number(body.pricePerNight) || 0))
    const subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0))
    const taxes = Math.max(0, Math.round(Number(body.taxes) || 0))
    const serviceFee = Math.max(0, Math.round(Number(body.serviceFee) || 0))
    const totalAmount = Math.max(0, Math.round(Number(body.totalAmount) || 0))

    if (!firstName || !lastName || !email || !checkIn || !checkOut || !roomId || !roomType) {
      return NextResponse.json({ error: "Compila tutti i campi obbligatori" }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Indirizzo email non valido" }, { status: 400 })
    }

    const checkInDate = new Date(`${checkIn}T00:00:00`)
    const checkOutDate = new Date(`${checkOut}T00:00:00`)
    const calculatedNights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000)

    if (
      Number.isNaN(checkInDate.getTime()) ||
      Number.isNaN(checkOutDate.getTime()) ||
      calculatedNights <= 0
    ) {
      return NextResponse.json({ error: "Intervallo di date non valido" }, { status: 400 })
    }

    const nights = calculatedNights
    const db = getAdminDb()
    const bookingRef = db.collection("bookings").doc()
    const bookingId = bookingRef.id

    const bookingData = {
      bookingId,
      email,
      firstName,
      lastName,
      phone,
      checkIn,
      checkOut,
      guests,
      children,
      roomType,
      roomName,
      roomId,
      nights,
      pricePerNight,
      subtotal,
      taxes,
      serviceFee,
      totalAmount,
      specialRequests,
      notes: specialRequests,
      currency: "EUR",
      status: "pending",
      origin: "site",
      paymentProvider: null,
      paymentId: null,
      paymentRequired: false,
      paidAt: null,
      emailDelivery: {
        customer: "pending",
        structure: "pending",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await bookingRef.set(bookingData)

    const safeBookingId = escapeHtml(bookingId)
    const safeName = `${escapeHtml(firstName)} ${escapeHtml(lastName)}`
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone || "Non indicato")
    const safeRoomName = escapeHtml(roomName)
    const safeRequests = escapeHtml(specialRequests || "Nessuna")
    const formattedCheckIn = formatDate(checkIn)
    const formattedCheckOut = formatDate(checkOut)
    const formattedTotal = formatMoney(totalAmount)

    const summaryRows = `
      <tr><td style="padding:8px 0;font-weight:600">Codice richiesta</td><td style="padding:8px 0;text-align:right">${safeBookingId}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Suite</td><td style="padding:8px 0;text-align:right">${safeRoomName}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Check-in</td><td style="padding:8px 0;text-align:right">${formattedCheckIn}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Check-out</td><td style="padding:8px 0;text-align:right">${formattedCheckOut}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Notti</td><td style="padding:8px 0;text-align:right">${nights}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Ospiti</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Totale indicativo</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${formattedTotal}</td></tr>
    `

    const resend = new Resend(apiKey)

    const customerEmail = resend.emails.send({
      from: fromEmail,
      to: email,
      replyTo: STRUCTURE_EMAIL,
      subject: `Richiesta di prenotazione ricevuta - ${roomName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#262626">
          <div style="background:#171717;color:#fff;padding:28px;text-align:center">
            <h1 style="margin:0;font-size:24px">CHAPLIN Luxury Holiday House</h1>
            <p style="margin:8px 0 0;color:#d3b25d">Richiesta di prenotazione ricevuta</p>
          </div>
          <div style="padding:28px;background:#faf9f5">
            <p>Gentile ${safeName},</p>
            <p>abbiamo ricevuto la tua richiesta di soggiorno. La struttura ti contatterà per confermare disponibilità e dettagli.</p>
            <table style="width:100%;border-collapse:collapse;background:#fff;padding:16px;margin:22px 0">${summaryRows}</table>
            <div style="background:#fff;border-left:4px solid #d3b25d;padding:14px 16px;margin:20px 0">
              <strong>Richieste speciali</strong>
              <p style="margin:8px 0 0;white-space:pre-wrap">${safeRequests}</p>
            </div>
            <p style="font-weight:600">Nessun pagamento è stato effettuato.</p>
            <p>Questa email conferma soltanto la ricezione della richiesta; la prenotazione diventerà definitiva dopo la conferma della struttura.</p>
            <p style="margin-top:28px">A presto,<br><strong>CHAPLIN Luxury Holiday House</strong></p>
          </div>
        </div>
      `,
    })

    const structureEmail = resend.emails.send({
      from: fromEmail,
      to: STRUCTURE_EMAIL,
      replyTo: email,
      subject: `Nuova richiesta di prenotazione - ${firstName} ${lastName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#262626">
          <div style="background:#171717;color:#fff;padding:24px">
            <h1 style="margin:0;font-size:22px">Nuova richiesta dal sito</h1>
          </div>
          <div style="padding:24px;background:#faf9f5">
            <p><strong>Contattare il cliente per confermare la prenotazione.</strong></p>
            <table style="width:100%;border-collapse:collapse;background:#fff;padding:16px;margin:20px 0">
              <tr><td style="padding:8px 0;font-weight:600">Cliente</td><td style="padding:8px 0;text-align:right">${safeName}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600">Email</td><td style="padding:8px 0;text-align:right">${safeEmail}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600">Telefono</td><td style="padding:8px 0;text-align:right">${safePhone}</td></tr>
              ${summaryRows}
            </table>
            <div style="background:#fff;border-left:4px solid #d3b25d;padding:14px 16px;margin:20px 0">
              <strong>Richieste speciali</strong>
              <p style="margin:8px 0 0;white-space:pre-wrap">${safeRequests}</p>
            </div>
            <p>Rispondendo a questa email, la risposta verrà indirizzata direttamente al cliente.</p>
          </div>
        </div>
      `,
    })

    const [customerResult, structureResult] = await Promise.allSettled([customerEmail, structureEmail])
    const customerDelivered =
      customerResult.status === "fulfilled" && !customerResult.value.error
    const structureDelivered =
      structureResult.status === "fulfilled" && !structureResult.value.error

    await bookingRef.update({
      emailDelivery: {
        customer: customerDelivered ? "sent" : "failed",
        structure: structureDelivered ? "sent" : "failed",
      },
      emailSentAt: customerDelivered && structureDelivered ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (!customerDelivered || !structureDelivered) {
      console.error("[Booking Request] Email delivery failed", {
        bookingId,
        customer: customerResult.status === "rejected" ? getErrorMessage(customerResult.reason) : customerResult.value.error,
        structure:
          structureResult.status === "rejected" ? getErrorMessage(structureResult.reason) : structureResult.value.error,
      })

      return NextResponse.json(
        {
          error: "Richiesta registrata, ma non è stato possibile inviare tutti i riepiloghi",
          bookingId,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, bookingId })
  } catch (error) {
    console.error("[Booking Request] Unexpected error:", error)
    return NextResponse.json({ error: "Impossibile inviare la richiesta di prenotazione" }, { status: 500 })
  }
}
