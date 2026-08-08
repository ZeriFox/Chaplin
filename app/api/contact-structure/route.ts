import { type NextRequest, NextResponse } from "next/server"
import { getEmailConfigStatus, sendEmail } from "@/lib/email-transport"

export const runtime = "nodejs"

const RECIPIENT_EMAIL = "chaplinviterbo@gmail.com"
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chaplinluxuryholidayhouse.it").replace(/\/+$/, "")
const EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function asText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function normalizeSubject(value: string) {
  const compact = value.toLocaleLowerCase("it-IT").replace(/[^a-zà-ÿ0-9]/g, "")
  if (compact === "informazioni") return "Informazioni"
  return value
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = asText(body.name, 120)
    const email = asText(body.email, 254).toLowerCase()
    const phone = asText(body.phone, 40)
    const subject = normalizeSubject(asText(body.subject, 160).replace(/[\r\n]+/g, " "))
    const message = asText(body.message, 5000)
    const website = asText(body.website, 200)

    if (website) return NextResponse.json({ success: true })

    if (!name || !email || !phone || !subject || !message) {
      return NextResponse.json({ error: "Compila tutti i campi richiesti." }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 })
    }
    if (phone.replace(/\D/g, "").length < 7) {
      return NextResponse.json({ error: "Inserisci un numero di telefono valido." }, { status: 400 })
    }

    const emailConfig = getEmailConfigStatus()
    if (!emailConfig.resend && !emailConfig.smtp) {
      return NextResponse.json({ error: "Il servizio email non è ancora configurato. Riprova più tardi." }, { status: 503 })
    }

    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone)
    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />")
    const receivedAt = new Intl.DateTimeFormat("it-IT", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    }).format(new Date())

    const result = await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || "Chaplin Luxury Holiday House <onboarding@resend.dev>",
      to: [RECIPIENT_EMAIL],
      replyTo: email,
      subject: `[Sito Chaplin] ${subject}`,
      text: [
        "Nuovo messaggio dal sito CHAPLIN Luxury Holiday House",
        "",
        `Nome: ${name}`,
        `Email: ${email}`,
        `Telefono: ${phone}`,
        `Oggetto: ${subject}`,
        `Ricevuto: ${receivedAt}`,
        "",
        "Messaggio:",
        message,
      ].join("\n"),
      html: `
        <!doctype html>
        <html lang="it">
          <body style="margin:0;padding:0;background:#f3f1eb;font-family:Arial,Helvetica,sans-serif;color:#24231f;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1eb;padding:32px 12px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e4dcc5;box-shadow:0 10px 30px rgba(35,31,22,.08);">
                    <tr>
                      <td style="padding:28px 32px;background:#1b1a17;text-align:center;">
                        <img src="${EMAIL_LOGO_URL}" width="260" alt="CHAPLIN Luxury Holiday House" style="display:block;width:100%;max-width:260px;height:auto;margin:0 auto;border:0;" />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:34px 34px 18px;">
                        <div style="font-size:12px;font-weight:700;color:#b18c32;letter-spacing:1.6px;text-transform:uppercase;">Nuovo messaggio dal sito</div>
                        <h1 style="margin:10px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#24231f;">${safeSubject}</h1>
                        <p style="margin:0;color:#777168;font-size:13px;">Ricevuto il ${receivedAt}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 34px 0;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f6f0;border:1px solid #ebe3cf;border-radius:12px;">
                          <tr>
                            <td style="padding:18px 20px;border-bottom:1px solid #ebe3cf;">
                              <div style="font-size:11px;color:#9a803e;text-transform:uppercase;letter-spacing:1px;">Nome</div>
                              <div style="margin-top:5px;font-size:16px;font-weight:700;color:#24231f;">${safeName}</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:18px 20px;">
                              <div style="font-size:11px;color:#9a803e;text-transform:uppercase;letter-spacing:1px;">Email</div>
                              <div style="margin-top:5px;font-size:16px;"><a href="mailto:${safeEmail}" style="color:#24231f;text-decoration:none;">${safeEmail}</a></div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px 34px 8px;">
                        <div style="font-size:11px;color:#9a803e;text-transform:uppercase;letter-spacing:1px;">Messaggio</div>
                        <div style="margin-top:10px;padding:20px;background:#ffffff;border-left:3px solid #c9a84c;font-size:16px;line-height:1.7;color:#3d3932;">${safeMessage}</div>
                        <p style="margin:16px 0 0;color:#3d3932;"><strong>Telefono:</strong> <a href="tel:${safePhone}" style="color:#24231f;">${safePhone}</a></p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px 34px 36px;text-align:center;">
                        <a href="mailto:${safeEmail}?subject=${encodeURIComponent(`Re: ${subject}`)}" style="display:inline-block;padding:13px 24px;background:#c9a84c;color:#1b1a17;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Rispondi a ${safeName}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px 28px;background:#f8f6f0;text-align:center;color:#8a8479;font-size:11px;line-height:1.5;">Messaggio inviato dal modulo contatti di CHAPLIN Luxury Holiday House.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    })

    if (result.error) {
      console.error("[Contact form] Email error:", result.error)
      return NextResponse.json({ error: "Non è stato possibile inviare il messaggio. Riprova." }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Contact form] Unexpected error:", error)
    return NextResponse.json({ error: "Si è verificato un errore durante l’invio." }, { status: 500 })
  }
}
