import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getBookingById } from "@/lib/firebase"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, services, notes } = body

    if (!bookingId || !services || services.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get booking details
    const booking = await getBookingById(bookingId)
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const serviceEmail = process.env.SERVICE_EXTRA_EMAIL || "progettocale@gmail.com"

    // Calculate total
    const total = services.reduce((sum: number, service: any) => sum + service.price, 0)

    // Send email to structure
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
      to: serviceEmail,
      replyTo: booking.email,
      subject: `Richiesta Servizi Extra - Prenotazione ${bookingId.slice(0, 12).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B4513;">Nuova Richiesta Servizi Extra</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Dati Cliente</h3>
            <p><strong>Nome:</strong> ${booking.firstName} ${booking.lastName}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Telefono:</strong> ${booking.phone || "Non fornito"}</p>
            <p><strong>ID Prenotazione:</strong> ${bookingId.slice(0, 12).toUpperCase()}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString("it-IT")}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT")}</p>
          </div>

          <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
            <h3>Servizi Richiesti</h3>
            <ul style="list-style: none; padding: 0;">
              ${services
                .map(
                  (service: any) => `
                <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>${service.name}</strong> - €${service.price}
                </li>
              `,
                )
                .join("")}
            </ul>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #8B4513;">
              <p style="font-size: 18px;"><strong>Totale Stimato:</strong> <span style="color: #8B4513; font-size: 24px;">€${total}</span></p>
            </div>
          </div>

          ${
            notes
              ? `
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Note del cliente:</strong></p>
              <p style="white-space: pre-wrap;">${notes}</p>
            </div>
          `
              : ""
          }

          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Contatta il cliente per confermare la disponibilità e finalizzare la prenotazione dei servizi.
          </p>
        </div>
      `,
    })

    console.log("[API] Extra services request sent successfully")

    return NextResponse.json({
      success: true,
      message: "Request sent successfully",
    })
  } catch (error: any) {
    console.error("[API] Error sending extra services request:", error)
    return NextResponse.json({ error: error.message || "Failed to send request" }, { status: 500 })
  }
}
