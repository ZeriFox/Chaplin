import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { getEmailConfigStatus, sendEmail } from "@/lib/email-transport"

const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://chaplinluxuryholidayhouse.it"
).replace(/\/+$/, "")
const EMAIL_LOGO_URL = `${PUBLIC_SITE_URL}/images/chaplin-logo-white.png`
const BRAND_NAME = "CHAPLIN Luxury Holiday House"
const BRAND_ADDRESS = "Via della Pettinara 48, 01100 Viterbo (VT)"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const emailConfig = getEmailConfigStatus()
    if (!emailConfig.resend && !emailConfig.smtp) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 })
    }

    const db = getAdminDb()

    // Calculate date 7 days from now
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const targetDate = sevenDaysFromNow.toISOString().split("T")[0]

    // Get all bookings with check-in in 7 days and deposit payment type
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("status", "in", ["paid", "confirmed"])
      .where("checkIn", "==", targetDate)
      .where("paymentType", "==", "deposit")
      .get()

    let emailsSent = 0

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data()

      // Skip if balance already paid
      if (booking.balancePaid) {
        continue
      }

      const depositAmount = booking.depositAmount || booking.totalAmount * 0.3
      const balanceAmount = booking.totalAmount - depositAmount
      const balanceAmountEur = (balanceAmount / 100).toFixed(2)

      // Send balance payment reminder email
      try {
        await sendEmail({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: booking.email,
          subject: `Promemoria: Pagamento saldo per il tuo soggiorno ad CHAPLIN Luxury Holiday House`,
          html: `
            <div style="background:#1b1a17;padding:24px;text-align:center;"><img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" title="${BRAND_ADDRESS}" style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;" /></div>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">💳 Pagamento Saldo Richiesto</h1>
              </div>

              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="color: #1e40af;">Ciao ${booking.firstName}!</h2>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  Il tuo soggiorno ad <strong>CHAPLIN Luxury Holiday House</strong> inizia tra <strong>7 giorni</strong>! 🎉
                </p>

                <p style="font-size: 16px; line-height: 1.6;">
                  È arrivato il momento di completare il pagamento del saldo della tua prenotazione.
                </p>

                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #1e40af;">Dettagli Pagamento</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Acconto pagato:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">€${(depositAmount / 100).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Saldo da pagare:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #1e40af; font-size: 20px;">€${balanceAmountEur}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;">Totale prenotazione:</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">€${(booking.totalAmount / 100).toFixed(2)}</td>
                    </tr>
                  </table>
                </div>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 25px 0;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>⚠️ Importante:</strong> Il pagamento del saldo deve essere completato entro le prossime 24 ore per confermare il tuo soggiorno.
                  </p>
                </div>

                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h4 style="margin-top: 0; color: #1e40af;">Dettagli Prenotazione</h4>
                  <p style="margin: 5px 0;"><strong>ID Prenotazione:</strong> ${doc.id.slice(0, 12).toUpperCase()}</p>
                  <p style="margin: 5px 0;"><strong>Camera:</strong> ${booking.roomName}</p>
                  <p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(booking.checkIn).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                  <p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(booking.checkOut).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                  <p style="margin: 5px 0;"><strong>Ospiti:</strong> ${booking.guests} ${booking.guests === 1 ? "persona" : "persone"}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${booking.balancePaymentUrl || `${PUBLIC_SITE_URL}/user/booking/${doc.id}/balance`}" 
                     style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Paga il Saldo Ora
                  </a>
                </div>

                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
                  <p style="margin: 0; font-size: 14px; color: #1e40af;">
                    💡 <strong>Hai domande?</strong> Contattaci a ${process.env.NEXT_PUBLIC_PRIVACY_EMAIL} o chiama il ${process.env.NEXT_PUBLIC_PRIVACY_PHONE}
                  </p>
                </div>

                <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center; line-height: 1.5;">
                  Questa email è stata inviata automaticamente. Non vediamo l'ora di darti il benvenuto ad CHAPLIN Luxury Holiday House! ✨
                </p>
              </div>
            </div>
          `,
        })

        // Update booking with reminder sent flag
        await doc.ref.update({
          balanceReminderSent: true,
          balanceReminderSentAt: new Date().toISOString(),
        })

        emailsSent++
      } catch (emailError) {
        console.error(`Error sending balance reminder to ${booking.email}:`, emailError)
      }
    }

    console.log(`[Cron] Balance payment reminders sent: ${emailsSent}`)

    return NextResponse.json({
      success: true,
      emailsSent,
      date: targetDate,
    })
  } catch (error: any) {
    console.error("[Cron] Error sending balance payment reminders:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
