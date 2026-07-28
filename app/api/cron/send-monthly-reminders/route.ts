import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getAdminDb()
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    const bookingsSnapshot = await db.collection("bookings").where("status", "in", ["paid", "confirmed"]).get()

    let emailsSent = 0
    let bookingsChecked = 0

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data()

      if (booking.checkIn <= todayStr) {
        continue // Skip past bookings
      }

      bookingsChecked++

      const lastReminder = booking.lastMonthlyReminder
        ? new Date(booking.lastMonthlyReminder)
        : new Date(booking.createdAt || booking.checkIn)
      const oneMonthAgo = new Date(today)
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      // Skip if less than 1 month since last reminder
      if (lastReminder > oneMonthAgo) {
        continue
      }

      // Check if user wants monthly reminders
      if (booking.userId) {
        const userDoc = await db.collection("users").doc(booking.userId).get()
        const userData = userDoc.data()

        if (userData?.notifications?.monthlyReminders === false) {
          continue
        }
      }

      const checkInDate = new Date(booking.checkIn)
      const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Send monthly reminder email
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@al22suite.com",
          to: booking.email,
          subject: `Promemoria: La tua prenotazione ad AL 22 Suite tra ${daysUntilCheckIn} giorni`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8B4513;">Ciao ${booking.firstName}!</h2>
              
              <p>Ti ricordiamo che hai una prenotazione confermata presso <strong>AL 22 Suite & Spa</strong>.</p>

              <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <h3 style="margin: 0 0 10px 0;">Il tuo soggiorno inizia tra</h3>
                <p style="font-size: 48px; font-weight: bold; margin: 0;">
                  ${daysUntilCheckIn}
                </p>
                <p style="font-size: 24px; margin: 10px 0 0 0;">giorni</p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">Dettagli della tua prenotazione:</h4>
                <p><strong>Camera:</strong> ${booking.roomName}</p>
                <p><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                <p><strong>Ospiti:</strong> ${booking.guests} ${booking.guests === 1 ? "persona" : "persone"}</p>
                <p><strong>Numero conferma:</strong> ${doc.id.slice(0, 12).toUpperCase()}</p>
              </div>

              <p>Non vediamo l'ora di darti il benvenuto!</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://al22suite.com/user/booking/${doc.id}" style="display: inline-block; background: #8B4513; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Visualizza Prenotazione
                </a>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
                Se non desideri più ricevere questi promemoria, puoi disattivarli nelle <a href="https://al22suite.com/user">impostazioni del tuo account</a>.
              </p>
            </div>
          `,
        })

        await db.collection("bookings").doc(doc.id).update({
          lastMonthlyReminder: todayStr,
        })

        emailsSent++
      } catch (emailError) {
        console.error(`Error sending email to ${booking.email}:`, emailError)
      }
    }

    console.log(`[Cron] Monthly reminders - Bookings checked: ${bookingsChecked}, Emails sent: ${emailsSent}`)

    return NextResponse.json({
      success: true,
      bookingsChecked,
      emailsSent,
    })
  } catch (error: any) {
    console.error("[Cron] Error sending monthly reminders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


