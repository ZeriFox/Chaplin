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
    const cronSecret = process.env.CRON_SECRET
    const emailConfig = getEmailConfigStatus()
    const firebaseConfigured =
      process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY

    if (!cronSecret || (!emailConfig.resend && !emailConfig.smtp) || !firebaseConfigured) {
      return NextResponse.json({ error: "Promotional emails are not configured yet" }, { status: 503 })
    }

    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getAdminDb()

    // Get all users who opted in for promotional emails
    const usersSnapshot = await db.collection("users").where("notifications.promos", "==", true).get()

    let emailsSent = 0

    for (const doc of usersSnapshot.docs) {
      const user = doc.data()

      // Send promotional email
      try {
        await sendEmail({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: user.email,
          subject: `È tempo di una pausa! Scopri CHAPLIN Luxury Holiday House 🌊`,
          html: `
            <div style="background:#1b1a17;padding:24px;text-align:center;"><img src="${EMAIL_LOGO_URL}" width="250" alt="${BRAND_NAME}" title="${BRAND_ADDRESS}" style="display:block;width:100%;max-width:250px;height:auto;margin:0 auto;border:0;" /></div>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                <p style="margin:0;font-size:18px;font-weight:600;">Esperienze e offerte esclusive</p>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Viterbo</p>
              </div>

              <div style="padding: 40px 20px;">
                <h2 style="color: #8B4513; margin-top: 0;">Ciao ${user.firstName || ""}! 👋</h2>
                
                <p style="font-size: 16px; line-height: 1.6;">
                  È passato un po' di tempo dall'ultima volta che ci siamo visti. Che ne dici di concederti una pausa e tornare a trovarci?
                </p>

                <div style="background: #f5f5f5; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
                  <h3 style="color: #8B4513; margin-top: 0;">✨ Vivi un'esperienza indimenticabile</h3>
                  <p style="margin: 15px 0;">
                    Rilassati nella nostra spa, goditi l’atmosfera del centro storico di Viterbo e lasciati coccolare dal nostro servizio esclusivo.
                  </p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
                  <div style="text-align: center; padding: 20px; background: white; border: 2px solid #f0f0f0; border-radius: 8px;">
                    <div style="font-size: 32px; margin-bottom: 10px;">🏖️</div>
                    <p style="margin: 0; font-weight: bold; color: #8B4513;">Centro Storico</p>
                  </div>
                  <div style="text-align: center; padding: 20px; background: white; border: 2px solid #f0f0f0; border-radius: 8px;">
                    <div style="font-size: 32px; margin-bottom: 10px;">💆</div>
                    <p style="margin: 0; font-weight: bold; color: #8B4513;">SPA Privata</p>
                  </div>
                </div>

                <p style="font-size: 16px; line-height: 1.6;">
                  Prenota ora il tuo prossimo soggiorno e regala a te stesso un momento di puro relax nel centro storico di Viterbo.
                </p>

                <div style="text-align: center; margin: 40px 0;">
                  <a href="${PUBLIC_SITE_URL}/prenota" style="display: inline-block; background: #8B4513; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                    Prenota Ora
                  </a>
                </div>

                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <p style="margin: 0; text-align: center; color: #1976d2;">
                    <strong>💙 Hai già un account?</strong><br>
                    <a href="${PUBLIC_SITE_URL}/user" style="color: #1976d2; text-decoration: underline;">Accedi per vedere le tue prenotazioni</a>
                  </p>
                </div>
              </div>

              <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  Non vuoi più ricevere queste email?<br>
                  <a href="${PUBLIC_SITE_URL}/user" style="color: #8B4513;">Gestisci le tue preferenze</a>
                </p>
              </div>
            </div>
          `,
        })

        emailsSent++
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError)
      }
    }

    console.log(`[Cron] Promotional emails sent: ${emailsSent}`)

    return NextResponse.json({
      success: true,
      emailsSent,
    })
  } catch (error: any) {
    console.error("[Cron] Error sending promotional emails:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
