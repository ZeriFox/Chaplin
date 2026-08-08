import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { getEmailConfigStatus, sendEmail } from "@/lib/email-transport"
import { SITE_CONFIG } from "@/lib/site-config"

const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://chaplinluxuryholidayhouse.it"
).replace(/\/+$/, "")
const EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`
const BRAND_NAME = "CHAPLIN Luxury Holiday House"
const BRAND_ADDRESS = SITE_CONFIG.address

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const emailConfig = getEmailConfigStatus()
    const firebaseConfigured =
      process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY

    if (!cronSecret || (!emailConfig.resend && !emailConfig.smtp) || !firebaseConfigured) {
      return NextResponse.json({ error: "Check-in reminders are not configured yet" }, { status: 503 })
    }

    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getAdminDb()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    // Get all paid/confirmed bookings and filter by check-in date in code
    const bookingsSnapshot = await db.collection("bookings").where("status", "in", ["paid", "confirmed"]).get()

    let emailsSent = 0

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data()

      // Check if user wants check-in reminders
      if (booking.userId) {
        const userDoc = await db.collection("users").doc(booking.userId).get()
        const userData = userDoc.data()

        if (userData?.notifications?.checkinReminders === false) {
          continue // Skip if user disabled reminders
        }
      }

      if (booking.checkIn !== tomorrowStr) {
        continue
      }

      // Send check-in reminder email
      try {
        await sendEmail({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: booking.email,
          subject: `Domani è il tuo check-in ad CHAPLIN Luxury Holiday House! 🎉`,
          html: `
            <div style="background:#1b1a17;padding:24px;text-align:center;"><img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" title="${BRAND_ADDRESS}" style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;" /></div>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8B4513;">Ciao ${booking.firstName}! 👋</h2>
              
              <p style="font-size: 18px; font-weight: bold; color: #8B4513;">Il tuo soggiorno inizia domani!</p>

              <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <h3 style="margin: 0 0 10px 0;">Check-in</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 0;">
                  ${new Date(booking.checkIn).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">dalle ore 15:00</p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0;">Dettagli della tua prenotazione:</h4>
                <p><strong>Camera:</strong> ${booking.roomName}</p>
                <p><strong>Ospiti:</strong> ${booking.guests} ${booking.guests === 1 ? "persona" : "persone"}</p>
                <p><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p>
                <p><strong>Numero conferma:</strong> ${doc.id.slice(0, 12).toUpperCase()}</p>
              </div>

              <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>📍 Indirizzo:</strong></p>
                <p style="margin: 5px 0 0 0;">CHAPLIN Luxury Holiday House<br>${BRAND_ADDRESS}</p>
              </div>

              <p>Se hai bisogno di assistenza o hai domande, non esitare a contattarci!</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${PUBLIC_SITE_URL}/user/booking/${doc.id}" style="display: inline-block; background: #8B4513; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Visualizza Prenotazione
                </a>
              </div>

              <p style="text-align: center; color: #8B4513; font-size: 18px; margin-top: 30px;">
                Non vediamo l'ora di darti il benvenuto! ✨
              </p>

              <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
                Puoi gestire le tue preferenze di notifica nelle <a href="${PUBLIC_SITE_URL}/user">impostazioni del tuo account</a>.
              </p>
            </div>
          `,
        })

        emailsSent++
      } catch (emailError) {
        console.error(`Error sending email to ${booking.email}:`, emailError)
      }
    }

    console.log(`[Cron] Check-in reminders sent: ${emailsSent}`)

    return NextResponse.json({
      success: true,
      emailsSent,
    })
  } catch (error: any) {
    console.error("[Cron] Error sending check-in reminders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

