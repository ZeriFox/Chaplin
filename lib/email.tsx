// lib/email.ts
// NOTE: file riscritto per CHAPLIN Luxury Holiday House + aggiunta sendBookingUpdateEmail
import { getEmailConfigStatus, sendEmail } from "@/lib/email-transport"

const BRAND = {
  name: "CHAPLIN Luxury Holiday House",
  city: "Viterbo, Italia",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://chaplin-house.vercel.app",
  fromFallback: "CHAPLIN <noreply@chaplin-house.com>",
}

interface BookingEmailData {
  to: string
  bookingId: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  roomName: string
  guests: number
  totalAmount: number // cents
  nights: number
  newUserPassword?: string

  originalAmount?: number
  newAmount?: number
  penalty?: number
  priceDifference?: number
  modificationType?: "change_dates" | "add_guests"
}

interface CancellationEmailData {
  to: string
  bookingId: string
  firstName: string
  lastName: string
  roomName: string
  checkIn: string
  checkOut: string
  guests: number
  originalAmount: number // €
  refundAmount: number // €
  penalty: number // €
  isFullRefund: boolean
  manualRefund?: boolean
}

interface ModificationEmailData {
  to: string
  bookingId: string
  firstName: string
  lastName: string
  checkIn: string
  checkOut: string
  roomName: string
  guests: number
  nights: number
  originalAmount: number // cents
  newAmount: number // cents
  penalty?: number // cents
  guestAdditionCost?: number // cents
  dateChangeCost?: number // cents
  modificationType: "dates" | "guests" | "both"
  refundAmount?: number // cents
  manualRefund?: boolean
}

type BookingUpdateEmailData = {
  to: string
  bookingId: string
  firstName?: string
  lastName?: string
  title?: string
  message?: string
  roomName?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  nights?: number
  totalAmount?: number // cents
}

function requireEmailConfig() {
  const config = getEmailConfigStatus()
  if (!config.from) return { ok: false as const, error: "Email sender not configured" }
  if (!config.resend && !config.smtp) return { ok: false as const, error: "Email service not configured" }
  return { ok: true as const }
}

function moneyFromCents(cents: number) {
  return `€${(cents / 100).toFixed(2)}`
}

export async function sendBookingConfirmationEmail(data: BookingEmailData) {
  try {
    const cfg = requireEmailConfig()
    if (!cfg.ok) return { success: false, error: cfg.error }

    const isNewUser = !!data.newUserPassword
    const siteUrl = BRAND.siteUrl

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}
    .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
    .booking-details{background:#fff;padding:20px;border-radius:8px;margin:20px 0}
    .detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
    .detail-label{font-weight:700;color:#059669}
    .credentials-box{background:#ecfeff;border:2px solid #10b981;padding:20px;border-radius:8px;margin:20px 0}
    .info-box{background:#ecfdf5;border:2px solid #10b981;padding:20px;border-radius:8px;margin:20px 0;color:#065f46}
    .button{display:inline-block;background:#059669;color:#fff;padding:12px 30px;text-decoration:none;border-radius:8px;margin:20px 0}
    .footer{text-align:center;color:#666;font-size:12px;margin-top:30px}
    code{background:#fff;padding:5px 10px;border-radius:6px}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Prenotazione Confermata!</h1>
      <p>${BRAND.name}</p>
    </div>

    <div class="content">
      <p>Gentile ${data.firstName} ${data.lastName},</p>
      <p>Grazie per aver scelto <strong>${BRAND.name}</strong>! La tua prenotazione è stata confermata con successo.</p>

      <div class="booking-details">
        <h2 style="color:#059669;margin-top:0">📋 Dettagli Prenotazione</h2>

        <div class="detail-row"><span class="detail-label">ID Prenotazione:</span><span>${data.bookingId}</span></div>
        <div class="detail-row"><span class="detail-label">Alloggio:</span><span>${data.roomName}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${data.checkIn}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${data.checkOut}</span></div>
        <div class="detail-row"><span class="detail-label">Notti:</span><span>${data.nights}</span></div>
        <div class="detail-row"><span class="detail-label">Ospiti:</span><span>${data.guests}</span></div>

        <div class="detail-row" style="border-bottom:none">
          <span class="detail-label">Importo Totale Pagato:</span>
          <span style="color:#059669;font-weight:700;font-size:18px">${moneyFromCents(data.totalAmount)}</span>
        </div>
      </div>

      ${
        isNewUser
          ? `
      <div class="credentials-box">
        <h3 style="margin-top:0;color:#065f46">🔐 Account Creato!</h3>
        <p>Abbiamo creato un account per te. Usa queste credenziali per accedere:</p>
        <p><strong>Email:</strong> ${data.to}</p>
        <p><strong>Password:</strong> <code>${data.newUserPassword}</code></p>
        <p style="font-size:12px;color:#065f46;margin-top:15px">⚠️ Ti consigliamo di cambiare la password al primo accesso.</p>
      </div>
      `
          : `
      <div class="info-box">
        <h3 style="margin-top:0">👤 Accedi al tuo Account</h3>
        <p>La prenotazione è stata aggiunta al tuo account. Accedi per visualizzare i dettagli e gestire le tue prenotazioni.</p>
        <p style="margin-bottom:0"><strong>Email:</strong> ${data.to}</p>
      </div>
      `
      }

      <div style="text-align:center">
        <a href="${siteUrl}/user" class="button">
          ${isNewUser ? "Accedi al tuo Account" : "Visualizza le tue Prenotazioni"}
        </a>
      </div>

      <p style="margin-top:30px">Se hai domande o necessiti di assistenza, non esitare a contattarci.</p>
      <p>A presto,<br><strong>Il Team di ${BRAND.name}</strong></p>
    </div>

    <div class="footer">
      <p>${BRAND.name}</p>
      <p>${BRAND.city}</p>
      <p>Questa è una email automatica, si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>`

    const { data: emailData, error } = await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || BRAND.fromFallback,
      to: data.to,
      subject: `✨ Prenotazione Confermata - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, emailId: emailData?.id, provider: emailData?.provider }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendCancellationEmail(data: CancellationEmailData) {
  try {
    const cfg = requireEmailConfig()
    if (!cfg.ok) return { success: false, error: cfg.error }

    const isManagementEmail =
      data.to.includes("@chaplin-house.com") || data.to === process.env.NEXT_PUBLIC_PRIVACY_EMAIL

    const subject = isManagementEmail
      ? `🔔 NOTIFICA CANCELLAZIONE - ${data.roomName} - ${data.bookingId}`
      : `❌ Prenotazione Cancellata - ${data.bookingId}`

    const refundBg = data.isFullRefund ? "#ecfdf5" : "#fffbeb"
    const refundBorder = data.isFullRefund ? "#10b981" : "#f59e0b"
    const refundTitleColor = data.isFullRefund ? "#059669" : "#92400e"

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}
    .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
    .booking-details{background:#fff;padding:20px;border-radius:8px;margin:20px 0}
    .detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
    .detail-label{font-weight:700;color:#dc2626}
    .refund-box{background:${refundBg};border:2px solid ${refundBorder};padding:20px;border-radius:8px;margin:20px 0}
    .footer{text-align:center;color:#666;font-size:12px;margin-top:30px}
    .admin-notice{background:#fee2e2;border:2px solid #dc2626;padding:15px;border-radius:8px;margin:20px 0;font-weight:700}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${isManagementEmail ? "🔔 NOTIFICA CANCELLAZIONE" : "❌ Prenotazione Cancellata"}</h1>
      <p>${BRAND.name}</p>
    </div>

    <div class="content">
      ${
        isManagementEmail
          ? `
      <div class="admin-notice">
        ⚠️ ATTENZIONE: Prenotazione cancellata. Verificare eventuale rimborso.
      </div>
      <p><strong>Cliente:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Email Cliente:</strong> ${data.to}</p>
      `
          : `<p>Gentile ${data.firstName} ${data.lastName},</p>`
      }

      <p>${isManagementEmail ? "Dettagli della prenotazione cancellata:" : "La tua prenotazione è stata cancellata con successo."}</p>

      <div class="booking-details">
        <h2 style="color:#dc2626;margin-top:0">📋 Dettagli Prenotazione</h2>

        <div class="detail-row"><span class="detail-label">ID Prenotazione:</span><span>${data.bookingId}</span></div>
        <div class="detail-row"><span class="detail-label">Alloggio:</span><span>${data.roomName}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${data.checkIn}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${data.checkOut}</span></div>
        <div class="detail-row"><span class="detail-label">Ospiti:</span><span>${data.guests}</span></div>
        <div class="detail-row" style="border-bottom:none"><span class="detail-label">Importo Originale:</span><span>€${data.originalAmount.toFixed(2)}</span></div>
      </div>

      <div class="refund-box">
        <h3 style="margin-top:0;color:${refundTitleColor}">
          ${data.isFullRefund ? "✅ Rimborso Completo" : "⚠️ Penale Applicata"}
        </h3>

        ${
          data.isFullRefund
            ? `
          <p><strong>Importo da Rimborsare:</strong> €${data.refundAmount.toFixed(2)}</p>
          <p style="font-size:14px;margin-top:15px">
            ${data.manualRefund ? "Il rimborso verrà elaborato manualmente dal nostro team entro 3 giorni lavorativi." : "Il rimborso verrà elaborato entro 3 giorni lavorativi."}
          </p>
        `
            : `
          <p><strong>Penale:</strong> €${data.penalty.toFixed(2)}</p>
          <p><strong>Importo da Rimborsare:</strong> €${data.refundAmount.toFixed(2)}</p>
          <p style="font-size:14px;margin-top:10px;color:#92400e">
            ⚠️ È stata applicata una penale in base alle condizioni di cancellazione.
          </p>
          <p style="font-size:14px;margin-top:10px">
            ${data.manualRefund ? "Il rimborso verrà elaborato manualmente dal nostro team entro 3 giorni lavorativi." : "Il rimborso verrà elaborato entro 3 giorni lavorativi."}
          </p>
        `
        }
      </div>

      <p style="margin-top:30px">Per qualsiasi richiesta, contattaci e saremo felici di aiutarti.</p>
      <p>Cordiali saluti,<br><strong>Il Team di ${BRAND.name}</strong></p>
    </div>

    <div class="footer">
      <p>${BRAND.name}</p>
      <p>${BRAND.city}</p>
      <p>Email automatica, si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>`

    const { data: emailData, error } = await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || BRAND.fromFallback,
      to: data.to,
      subject,
      html: emailHtml,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, emailId: emailData?.id, provider: emailData?.provider }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function sendModificationEmail(data: ModificationEmailData) {
  try {
    const cfg = requireEmailConfig()
    if (!cfg.ok) return { success: false, error: cfg.error }

    const siteUrl = BRAND.siteUrl
    const difference = data.newAmount - data.originalAmount

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}
    .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
    .booking-details{background:#fff;padding:20px;border-radius:8px;margin:20px 0}
    .detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
    .detail-label{font-weight:700;color:#059669}
    .cost-breakdown{background:#ecfdf5;border:2px solid #10b981;padding:20px;border-radius:8px;margin:20px 0}
    .refund-box{background:#ecfdf5;border:2px solid #10b981;padding:20px;border-radius:8px;margin:20px 0;color:#065f46}
    .button{display:inline-block;background:#059669;color:#fff;padding:12px 30px;text-decoration:none;border-radius:8px;margin:20px 0}
    .footer{text-align:center;color:#666;font-size:12px;margin-top:30px}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✏️ Prenotazione Modificata</h1>
      <p>${BRAND.name}</p>
    </div>

    <div class="content">
      <p>Gentile ${data.firstName} ${data.lastName},</p>
      <p>La tua prenotazione è stata modificata con successo. Ecco i nuovi dettagli:</p>

      <div class="booking-details">
        <h2 style="color:#059669;margin-top:0">📋 Nuovi Dettagli Prenotazione</h2>

        <div class="detail-row"><span class="detail-label">ID Prenotazione:</span><span>${data.bookingId}</span></div>
        <div class="detail-row"><span class="detail-label">Alloggio:</span><span>${data.roomName}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in:</span><span>${data.checkIn}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out:</span><span>${data.checkOut}</span></div>
        <div class="detail-row"><span class="detail-label">Notti:</span><span>${data.nights}</span></div>
        <div class="detail-row"><span class="detail-label">Ospiti:</span><span>${data.guests}</span></div>

        <div class="detail-row" style="border-bottom:none">
          <span class="detail-label">Importo Totale:</span>
          <span style="color:#059669;font-weight:700;font-size:18px">${moneyFromCents(data.newAmount)}</span>
        </div>
      </div>

      ${
        data.refundAmount && data.manualRefund
          ? `
      <div class="refund-box">
        <h3 style="margin-top:0;color:#059669">✅ Rimborso in Elaborazione</h3>
        <p><strong>Importo da Rimborsare:</strong> ${moneyFromCents(data.refundAmount)}</p>
        <p style="font-size:14px;margin-top:15px">
          Il rimborso verrà elaborato manualmente dal nostro team. Sono necessari da 5 a 10 giorni perché compaia nell'estratto conto.
        </p>
      </div>
      `
          : ""
      }

      <div class="cost-breakdown">
        <h3 style="margin-top:0;color:#059669">💰 Riepilogo</h3>

        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #bbf7d0">
          <span>Prenotazione Originale:</span>
          <span>${moneyFromCents(data.originalAmount)}</span>
        </div>

        ${
          data.penalty
            ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #bbf7d0;color:#dc2626">
          <span>Penale:</span>
          <span>+${moneyFromCents(data.penalty)}</span>
        </div>
        `
            : ""
        }

        ${
          data.dateChangeCost && data.dateChangeCost > 0
            ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #bbf7d0">
          <span>Differenza Prezzo:</span>
          <span>+${moneyFromCents(data.dateChangeCost)}</span>
        </div>
        `
            : ""
        }

        ${
          data.refundAmount && data.manualRefund
            ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #bbf7d0;color:#059669">
          <span>Rimborso da Ricevere:</span>
          <span>-${moneyFromCents(data.refundAmount)}</span>
        </div>
        `
            : ""
        }

        <div style="display:flex;justify-content:space-between;padding:15px 0 0 0;margin-top:10px;border-top:2px solid #059669;font-size:18px">
          <span style="font-weight:700">Nuovo Importo Totale:</span>
          <span style="font-weight:700;color:#059669">${moneyFromCents(data.newAmount)}</span>
        </div>

        ${
          difference > 0 && !data.refundAmount
            ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:15px;border-top:1px solid #bbf7d0">
          <span style="color:#dc2626">Importo Pagato al Cambio:</span>
          <span style="color:#dc2626;font-weight:700">${moneyFromCents(difference)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span style="color:#059669">Importo Totale Pagato:</span>
          <span style="color:#059669;font-weight:700">${moneyFromCents(data.newAmount)}</span>
        </div>
        `
            : ""
        }
      </div>

      <div style="text-align:center">
        <a class="button" href="${siteUrl}/user/booking/${data.bookingId}">Visualizza Prenotazione</a>
      </div>

      <p style="margin-top:30px">Per qualsiasi richiesta, contattaci e saremo felici di aiutarti.</p>
      <p>A presto,<br><strong>Il Team di ${BRAND.name}</strong></p>
    </div>

    <div class="footer">
      <p>${BRAND.name}</p>
      <p>${BRAND.city}</p>
      <p>Email automatica, si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>`

    const { data: emailData, error } = await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || BRAND.fromFallback,
      to: data.to,
      subject: `✏️ Prenotazione Modificata - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, emailId: emailData?.id, provider: emailData?.provider }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * ✅ Funzione mancante che ti rompeva la build:
 * usata da /app/api/bookings/update-after-payment/route.ts
 */
export async function sendBookingUpdateEmail(data: BookingUpdateEmailData) {
  try {
    const cfg = requireEmailConfig()
    if (!cfg.ok) return { success: false, error: cfg.error }

    const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim()

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0}
    .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
    .box{background:#fff;padding:20px;border-radius:8px;margin:20px 0}
    .detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
    .detail-label{font-weight:700;color:#059669}
    .button{display:inline-block;background:#059669;color:#fff;padding:12px 30px;text-decoration:none;border-radius:8px;margin:20px 0}
    .footer{text-align:center;color:#666;font-size:12px;margin-top:30px}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ ${data.title || "Aggiornamento Prenotazione"}</h1>
      <p>${BRAND.name}</p>
    </div>

    <div class="content">
      <p>Gentile ${fullName || "ospite"},</p>
      <p>${data.message || "Ti confermiamo un aggiornamento relativo alla tua prenotazione."}</p>

      <div class="box">
        <h2 style="color:#059669;margin-top:0">📋 Riepilogo</h2>

        <div class="detail-row"><span class="detail-label">ID Prenotazione:</span><span>${data.bookingId}</span></div>
        ${data.roomName ? `<div class="detail-row"><span class="detail-label">Alloggio:</span><span>${data.roomName}</span></div>` : ""}
        ${data.checkIn ? `<div class="detail-row"><span class="detail-label">Check-in:</span><span>${data.checkIn}</span></div>` : ""}
        ${data.checkOut ? `<div class="detail-row"><span class="detail-label">Check-out:</span><span>${data.checkOut}</span></div>` : ""}
        ${typeof data.guests === "number" ? `<div class="detail-row"><span class="detail-label">Ospiti:</span><span>${data.guests}</span></div>` : ""}
        ${typeof data.nights === "number" ? `<div class="detail-row"><span class="detail-label">Notti:</span><span>${data.nights}</span></div>` : ""}

        ${
          typeof data.totalAmount === "number"
            ? `<div class="detail-row" style="border-bottom:none"><span class="detail-label">Totale:</span><span style="color:#059669;font-weight:700">${moneyFromCents(
                data.totalAmount,
              )}</span></div>`
            : `<div class="detail-row" style="border-bottom:none"></div>`
        }
      </div>

      <div style="text-align:center">
        <a class="button" href="${BRAND.siteUrl}/user">Apri il tuo account</a>
      </div>

      <p style="margin-top:30px">Per qualsiasi richiesta, contattaci e saremo felici di aiutarti.</p>
      <p>A presto,<br><strong>Il Team di ${BRAND.name}</strong></p>
    </div>

    <div class="footer">
      <p>${BRAND.name}</p>
      <p>${BRAND.city}</p>
      <p>Email automatica, si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>`

    const { data: emailData, error } = await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || BRAND.fromFallback,
      to: data.to,
      subject: `✅ Aggiornamento Prenotazione - ${data.bookingId}`,
      html: emailHtml,
    })

    if (error) return { success: false, error: error.message }
    return { success: true, emailId: emailData?.id, provider: emailData?.provider }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
