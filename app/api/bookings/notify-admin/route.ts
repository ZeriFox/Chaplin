import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Lazy Resend init - wrapped in closure to avoid build-time evaluation
const getResend = (() => {
  let instance: Resend | null = null
  return (): Resend | null => {
    if (!instance && process.env.RESEND_API_KEY) {
      instance = new Resend(process.env.RESEND_API_KEY)
    }
    return instance
  }
})()

export async function POST(request: NextRequest) {
  try {
    const resend = getResend()
    if (!resend) {
      console.error('[v0] Resend API key not configured')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const { bookingId, roomName, checkIn, checkOut, guestName } = await request.json()

    const beds24BlockUrl = `https://beds24.com/control2.php?pagetype=calendar`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.RESEND_FROM_EMAIL!,
      subject: `⚠️ Nuova Prenotazione Sito - Bloccare su Beds24`,
      html: `
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
