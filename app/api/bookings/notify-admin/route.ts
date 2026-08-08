import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-transport'
import { SITE_CONFIG } from '@/lib/site-config'

const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://chaplinluxuryholidayhouse.it"
).replace(/\/+$/, "")
const EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`
const BRAND_NAME = "CHAPLIN Luxury Holiday House"
const BRAND_ADDRESS = SITE_CONFIG.address

export async function POST(request: NextRequest) {
  try {
    const { bookingId, roomName, checkIn, checkOut, guestName } = await request.json()

    const beds24BlockUrl = `https://beds24.com/control2.php?pagetype=calendar`

    await sendEmail({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.RESEND_FROM_EMAIL!,
      subject: `⚠️ Nuova Prenotazione Sito - Bloccare su Beds24`,
      html: `
        <div style="background:#1b1a17;padding:24px;text-align:center;"><img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" title="${BRAND_ADDRESS}" style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;" /></div>
            <h2>Nuova Prenotazione dal Sito Web</h2>
        <p><strong>AZIONE RICHIESTA:</strong> Bloccare le date su Beds24 per evitare doppie prenotazioni.</p>
        
        <h3>Dettagli Prenotazione:</h3>
        <ul>
          <li><strong>ID Prenotazione:</strong> ${bookingId}</li>
          <li><strong>Camera:</strong> ${roomName}</li>
          <li><strong>Ospite:</strong> ${guestName}</li>
          <li><strong>Check-in:</strong> ${checkIn}</li>
          <li><strong>Check-out:</strong> ${checkOut}</li>
        </ul>

        <p><a href="${beds24BlockUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Vai al Calendario Beds24
        </a></p>

        <hr style="margin: 24px 0;">
        <p style="color: #666; font-size: 14px;">
          <strong>Come bloccare le date:</strong><br>
          1. Clicca sul link sopra per aprire il calendario Beds24<br>
          2. Seleziona la camera: <strong>${roomName}</strong><br>
          3. Blocca dal <strong>${checkIn}</strong> al <strong>${checkOut}</strong><br>
          4. Questo impedirà prenotazioni doppie da Booking.com e Airbnb
        </p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error sending admin notification:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
