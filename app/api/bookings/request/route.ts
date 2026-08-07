import { NextResponse } from "next/server"
import { FieldValue, type DocumentReference } from "firebase-admin/firestore"
import { getEmailConfigStatus, sendEmail } from "@/lib/email-transport"
import { getAdminDb } from "@/lib/firebase-admin"
import { calculateBookingPrice } from "@/lib/pricing-engine"
import { claimCouponForBooking, CouponError } from "@/lib/coupons"

export const dynamic = "force-dynamic"

const STRUCTURE_EMAIL = "chaplinviterbo@gmail.com"
const MAX_TEXT_LENGTH = 2_000
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chaplinluxuryholidayhouse.it")
  .replace(/\/+$/, "")
const BOOKING_EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-readable.png`

type BookingRequestBody = {
  bookingId?: string
  language?: string
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
  couponCode?: string
  discountAmount?: number
  specialRequests?: string
}

type BookingLanguage = "it" | "en" | "fr" | "es" | "de"

type CustomerEmailCopy = {
  locale: string
  subject: string
  subtitle: string
  greeting: string
  intro: string
  labels: {
    bookingCode: string
    suite: string
    checkIn: string
    checkOut: string
    nights: string
    guests: string
    total: string
  }
  specialRequests: string
  noSpecialRequests: string
  noPayment: string
  confirmationNotice: string
  closing: string
}

const CUSTOMER_EMAIL_COPY: Record<BookingLanguage, CustomerEmailCopy> = {
  it: {
    locale: "it-IT",
    subject: "Richiesta di prenotazione ricevuta",
    subtitle: "Richiesta di prenotazione ricevuta",
    greeting: "Gentile",
    intro: "Abbiamo ricevuto la tua richiesta di soggiorno. La struttura ti contatterà per confermare disponibilità e dettagli.",
    labels: {
      bookingCode: "Codice richiesta",
      suite: "Suite",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Notti",
      guests: "Ospiti",
      total: "Totale indicativo",
    },
    specialRequests: "Richieste speciali",
    noSpecialRequests: "Nessuna",
    noPayment: "Nessun pagamento è stato effettuato.",
    confirmationNotice: "Questa email conferma soltanto la ricezione della richiesta; la prenotazione diventerà definitiva dopo la conferma della struttura.",
    closing: "A presto",
  },
  en: {
    locale: "en-GB",
    subject: "Booking request received",
    subtitle: "Booking request received",
    greeting: "Dear",
    intro: "We have received your stay request. The property will contact you to confirm availability and details.",
    labels: {
      bookingCode: "Request code",
      suite: "Suite",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Nights",
      guests: "Guests",
      total: "Estimated total",
    },
    specialRequests: "Special requests",
    noSpecialRequests: "None",
    noPayment: "No payment has been made.",
    confirmationNotice: "This email only confirms receipt of your request; the booking will become final once it has been confirmed by the property.",
    closing: "See you soon",
  },
  fr: {
    locale: "fr-FR",
    subject: "Demande de réservation reçue",
    subtitle: "Demande de réservation reçue",
    greeting: "Bonjour",
    intro: "Nous avons bien reçu votre demande de séjour. L’établissement vous contactera pour confirmer les disponibilités et les détails.",
    labels: {
      bookingCode: "Code de la demande",
      suite: "Suite",
      checkIn: "Arrivée",
      checkOut: "Départ",
      nights: "Nuits",
      guests: "Personnes",
      total: "Total estimatif",
    },
    specialRequests: "Demandes particulières",
    noSpecialRequests: "Aucune",
    noPayment: "Aucun paiement n’a été effectué.",
    confirmationNotice: "Cet e-mail confirme uniquement la réception de votre demande ; la réservation deviendra définitive après confirmation de l’établissement.",
    closing: "À bientôt",
  },
  es: {
    locale: "es-ES",
    subject: "Solicitud de reserva recibida",
    subtitle: "Solicitud de reserva recibida",
    greeting: "Estimado/a",
    intro: "Hemos recibido tu solicitud de estancia. El alojamiento se pondrá en contacto contigo para confirmar la disponibilidad y los detalles.",
    labels: {
      bookingCode: "Código de solicitud",
      suite: "Suite",
      checkIn: "Entrada",
      checkOut: "Salida",
      nights: "Noches",
      guests: "Huéspedes",
      total: "Total estimado",
    },
    specialRequests: "Peticiones especiales",
    noSpecialRequests: "Ninguna",
    noPayment: "No se ha realizado ningún pago.",
    confirmationNotice: "Este correo solo confirma la recepción de tu solicitud; la reserva será definitiva después de la confirmación del alojamiento.",
    closing: "Hasta pronto",
  },
  de: {
    locale: "de-DE",
    subject: "Buchungsanfrage erhalten",
    subtitle: "Buchungsanfrage erhalten",
    greeting: "Guten Tag",
    intro: "Wir haben Ihre Aufenthaltsanfrage erhalten. Die Unterkunft wird Sie kontaktieren, um Verfügbarkeit und Einzelheiten zu bestätigen.",
    labels: {
      bookingCode: "Anfragecode",
      suite: "Suite",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Nächte",
      guests: "Gäste",
      total: "Voraussichtlicher Gesamtbetrag",
    },
    specialRequests: "Besondere Wünsche",
    noSpecialRequests: "Keine",
    noPayment: "Es wurde keine Zahlung vorgenommen.",
    confirmationNotice: "Diese E-Mail bestätigt nur den Eingang Ihrer Anfrage; die Buchung wird erst nach Bestätigung durch die Unterkunft verbindlich.",
    closing: "Bis bald",
  },
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

function getBookingLanguage(value: unknown): BookingLanguage {
  return ["it", "en", "fr", "es", "de"].includes(String(value))
    ? (String(value) as BookingLanguage)
    : "it"
}

function formatDate(value: string, locale = "it-IT") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

function formatMoney(cents: number, locale = "it-IT") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function getErrorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

function emailHeader(subtitle: string) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f5f2e9;border-bottom:3px solid #d3b25d">
      <tr>
        <td style="padding:24px 28px;text-align:center">
          <img
            src="${BOOKING_EMAIL_LOGO_URL}"
            width="300"
            alt="CHAPLIN Luxury Holiday House"
            style="display:block;width:100%;max-width:300px;height:auto;margin:0 auto;border:0"
          />
          <p style="margin:14px 0 0;color:#9a7626;font-size:15px;font-weight:600">${subtitle}</p>
        </td>
      </tr>
    </table>
  `
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BookingRequestBody
    const bookingId = cleanText(body.bookingId, 100)
    const bookingLanguage = getBookingLanguage(body.language)
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
    let pricePerNight = Math.max(0, Number(body.pricePerNight) || 0)
    let subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0))
    let taxes = Math.max(0, Math.round(Number(body.taxes) || 0))
    let serviceFee = Math.max(0, Math.round(Number(body.serviceFee) || 0))
    let totalAmount = Math.max(0, Math.round(Number(body.totalAmount) || 0))
    const requestedCouponCode = cleanText(body.couponCode, 40).toUpperCase()

    if (!bookingId || !firstName || !lastName || !email || !checkIn || !checkOut || !roomId || !roomType) {
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
    const bookingDocumentId = bookingId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100)

    if (!bookingDocumentId) {
      return NextResponse.json({ error: "Codice richiesta non valido" }, { status: 400 })
    }

    const authoritativePrice = await calculateBookingPrice({ roomId, checkIn, checkOut })
    pricePerNight = authoritativePrice.pricePerNight
    subtotal = Math.round(authoritativePrice.totalPrice * 100)
    taxes = 0
    serviceFee = 0
    totalAmount = subtotal

    let couponCode = ""
    let discountAmount = 0
    if (requestedCouponCode) {
      const claimedCoupon = await claimCouponForBooking({
        code: requestedCouponCode,
        subtotal: subtotal / 100,
        checkIn,
        bookingId: bookingDocumentId,
      })
      couponCode = claimedCoupon.code
      discountAmount = Math.round(claimedCoupon.discount * 100)
      totalAmount = Math.round(claimedCoupon.finalTotal * 100)
    }

    let bookingRef: DocumentReference | null = null
    let bookingPersisted = false
    const bookingData: Record<string, unknown> = {
      bookingId,
      guestFirst: firstName,
      guestLast: lastName,
      firstName,
      lastName,
      email,
      phone,
      checkIn,
      checkOut,
      guests,
      numberOfChildren: children,
      children,
      roomId,
      roomType,
      roomName,
      nights,
      pricePerNight,
      subtotal,
      subtotalBeforeDiscount: subtotal,
      couponCode: couponCode || null,
      discountAmount,
      taxes,
      serviceFee,
      total: totalAmount,
      totalAmount,
      currency: "EUR",
      language: bookingLanguage,
      specialRequests,
      notes: specialRequests,
      origin: "site",
      status: "pending",
      updatedAt: FieldValue.serverTimestamp(),
    }

    try {
      bookingRef = getAdminDb().collection("bookings").doc(bookingDocumentId)
      const existingBooking = await bookingRef.get()
      bookingData.origin = existingBooking.get("origin") || "site"
      bookingData.status = existingBooking.get("status") || "pending"

      if (!existingBooking.exists) {
        bookingData.createdAt = FieldValue.serverTimestamp()
        bookingData.services = []
        bookingData.paymentProvider = null
        bookingData.paymentId = null
        bookingData.paidAt = null
      }

      await bookingRef.set(bookingData, { merge: true })
      bookingPersisted = true
    } catch (storageError) {
      console.error("[Booking Request] Persistence failed; continuing with email delivery", {
        bookingId,
        error: getErrorMessage(storageError),
      })
    }

    const emailConfig = getEmailConfigStatus()
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL

    if ((!emailConfig.resend && !emailConfig.smtp) || !fromEmail) {
      if (bookingPersisted && bookingRef) {
        try {
          await bookingRef.set(
            {
              emailDelivery: {
                customer: false,
                structure: false,
                error: "email_not_configured",
              },
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )
        } catch (storageError) {
          console.error("[Booking Request] Unable to record email configuration failure", {
            bookingId,
            error: getErrorMessage(storageError),
          })
        }
      }

      return NextResponse.json(
        { error: "Richiesta registrata, ma il servizio email non è configurato", bookingId },
        { status: 503 },
      )
    }

    const customerCopy = CUSTOMER_EMAIL_COPY[bookingLanguage]
    const safeBookingId = escapeHtml(bookingId)
    const safeName = `${escapeHtml(firstName)} ${escapeHtml(lastName)}`
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone || "Non indicato")
    const safeRoomName = escapeHtml(roomName)
    const safeCustomerRequests = escapeHtml(specialRequests || customerCopy.noSpecialRequests)
    const safeStructureRequests = escapeHtml(specialRequests || "Nessuna")
    const customerCheckIn = formatDate(checkIn, customerCopy.locale)
    const customerCheckOut = formatDate(checkOut, customerCopy.locale)
    const customerSubtotal = formatMoney(subtotal, customerCopy.locale)
    const customerDiscount = formatMoney(discountAmount, customerCopy.locale)
    const customerTotal = formatMoney(totalAmount, customerCopy.locale)
    const structureCheckIn = formatDate(checkIn)
    const structureCheckOut = formatDate(checkOut)
    const structureSubtotal = formatMoney(subtotal)
    const structureDiscount = formatMoney(discountAmount)
    const structureTotal = formatMoney(totalAmount)
    const safeCouponCode = escapeHtml(couponCode)

    const customerSummaryRows = `
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.bookingCode}</td><td style="padding:8px 0;text-align:right">${safeBookingId}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.suite}</td><td style="padding:8px 0;text-align:right">${safeRoomName}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.checkIn}</td><td style="padding:8px 0;text-align:right">${customerCheckIn}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.checkOut}</td><td style="padding:8px 0;text-align:right">${customerCheckOut}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.nights}</td><td style="padding:8px 0;text-align:right">${nights}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.guests}</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      ${couponCode ? `<tr><td style="padding:8px 0;font-weight:600">Subtotale</td><td style="padding:8px 0;text-align:right">${customerSubtotal}</td></tr><tr><td style="padding:8px 0;font-weight:600">Coupon ${safeCouponCode}</td><td style="padding:8px 0;text-align:right;color:#238636">-${customerDiscount}</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.total}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${customerTotal}</td></tr>
    `

    const structureSummaryRows = `
      <tr><td style="padding:8px 0;font-weight:600">Codice richiesta</td><td style="padding:8px 0;text-align:right">${safeBookingId}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Suite</td><td style="padding:8px 0;text-align:right">${safeRoomName}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Check-in</td><td style="padding:8px 0;text-align:right">${structureCheckIn}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Check-out</td><td style="padding:8px 0;text-align:right">${structureCheckOut}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Notti</td><td style="padding:8px 0;text-align:right">${nights}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Ospiti</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      ${couponCode ? `<tr><td style="padding:8px 0;font-weight:600">Subtotale</td><td style="padding:8px 0;text-align:right">${structureSubtotal}</td></tr><tr><td style="padding:8px 0;font-weight:600">Coupon ${safeCouponCode}</td><td style="padding:8px 0;text-align:right;color:#238636">-${structureDiscount}</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-weight:600">Totale indicativo</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${structureTotal}</td></tr>
    `

    const customerEmail = sendEmail({
      from: fromEmail,
      to: email,
      replyTo: STRUCTURE_EMAIL,
      subject: `${customerCopy.subject} - ${roomName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#262626">
          ${emailHeader(customerCopy.subtitle)}
          <div style="padding:28px;background:#faf9f5">
            <p>${customerCopy.greeting} ${safeName},</p>
            <p>${customerCopy.intro}</p>
            <table style="width:100%;border-collapse:collapse;background:#fff;padding:16px;margin:22px 0">${customerSummaryRows}</table>
            <div style="background:#fff;border-left:4px solid #d3b25d;padding:14px 16px;margin:20px 0">
              <strong>${customerCopy.specialRequests}</strong>
              <p style="margin:8px 0 0;white-space:pre-wrap">${safeCustomerRequests}</p>
            </div>
            <p style="font-weight:600">${customerCopy.noPayment}</p>
            <p>${customerCopy.confirmationNotice}</p>
            <p style="margin-top:28px">${customerCopy.closing},<br><strong>CHAPLIN Luxury Holiday House</strong></p>
          </div>
        </div>
      `,
    })

    const structureEmail = sendEmail({
      from: fromEmail,
      to: STRUCTURE_EMAIL,
      replyTo: email,
      subject: `Nuova richiesta di prenotazione - ${firstName} ${lastName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#262626">
          ${emailHeader("Nuova richiesta di prenotazione dal sito")}
          <div style="padding:24px;background:#faf9f5">
            <p><strong>Contattare il cliente per confermare la prenotazione.</strong></p>
            ${
              bookingPersisted
                ? ""
                : `<div style="background:#fff3cd;border-left:4px solid #d3b25d;padding:14px 16px;margin:20px 0"><strong>Attenzione:</strong> la richiesta non è stata salvata nel pannello admin. Conservare il codice ${safeBookingId} e gestirla manualmente.</div>`
            }
            <table style="width:100%;border-collapse:collapse;background:#fff;padding:16px;margin:20px 0">
              <tr><td style="padding:8px 0;font-weight:600">Cliente</td><td style="padding:8px 0;text-align:right">${safeName}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600">Email</td><td style="padding:8px 0;text-align:right">${safeEmail}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600">Telefono</td><td style="padding:8px 0;text-align:right">${safePhone}</td></tr>
              <tr><td style="padding:8px 0;font-weight:600">Lingua cliente</td><td style="padding:8px 0;text-align:right">${bookingLanguage.toUpperCase()}</td></tr>
              ${structureSummaryRows}
            </table>
            <div style="background:#fff;border-left:4px solid #d3b25d;padding:14px 16px;margin:20px 0">
              <strong>Richieste speciali</strong>
              <p style="margin:8px 0 0;white-space:pre-wrap">${safeStructureRequests}</p>
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

    if (bookingPersisted && bookingRef) {
      try {
        await bookingRef.set(
          {
            emailDelivery: {
              customer: customerDelivered,
              structure: structureDelivered,
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
      } catch (storageError) {
        console.error("[Booking Request] Unable to record email delivery status", {
          bookingId,
          error: getErrorMessage(storageError),
        })
      }
    }

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

    return NextResponse.json({ success: true, bookingId, persisted: bookingPersisted })
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[Booking Request] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile registrare la richiesta di prenotazione" }, { status: 500 })
  }
}
