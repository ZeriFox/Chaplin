import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

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
    const body = await request.json()
    const { bookingId, message, userEmail, userName } = body

    if (!bookingId || !message || !userEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const resend = getResend()
    if (!resend) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 })
    }

    const structureEmail = "progettocale@gmail.com"

    // Send email to structure
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
      to: structureEmail,
      replyTo: userEmail,
      subject: `Messaggio da ${userName} - Prenotazione ${bookingId.slice(0, 12).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4513;">Nuovo messaggio da un ospite</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Da:</strong> ${userName}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>ID Prenotazione:</strong> ${bookingId.slice(0, 12).toUpperCase()}</p>
          </div>

          <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <p><strong>Messaggio:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Puoi rispondere direttamente a questa email per contattare l'ospite.
          </p>
        </div>
      `,
    })

    console.log("[API] Contact message sent successfully")

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    })
  } catch (error: any) {
    console.error("[API] Error sending contact message:", error)
    return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 })
  }
}

