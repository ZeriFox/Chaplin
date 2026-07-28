import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
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

// Generate random 4-digit OTP
function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

async function sendSMS(phoneNumber: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error("Twilio credentials not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment variables.")
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: twilioPhone,
        Body: message,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to send SMS: ${error.message}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { newEmail, userId, method = "email" } = await request.json()

    if (!newEmail || !userId) {
      return NextResponse.json({ error: "Missing newEmail or userId" }, { status: 400 })
    }

    const db = getAdminDb()
    
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data()
    
    if (!userData || (!userData.email && !userData.phone)) {
      return NextResponse.json({ 
        error: "Admin contact info not found." 
      }, { status: 400 })
    }

    const currentEmail = userData.email
    const adminPhone = userData.phone
    
    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    await db.collection("admin_otp").doc("email_change").set({
      otp,
      newEmail,
      userId,
      type: "email",
      expiresAt,
      createdAt: Date.now(),
    })

    if (method === "sms") {
      if (!adminPhone) {
        return NextResponse.json({ error: "Phone number not configured" }, { status: 400 })
      }
      
      try {
        await sendSMS(
          String(adminPhone),
          `Il tuo codice di verifica per modificare l'email è: ${otp}. Valido per 10 minuti.`
        )
        
        console.log(`[v0] Sent Email change OTP via SMS to ${adminPhone}: ${otp}`)
        
        const maskedPhone = String(adminPhone).replace(/(.{4})(.*)(.{3})/, (_, a, b, c) => a + "*".repeat(Math.max(0, b.length)) + c)
        
        return NextResponse.json({ 
          success: true, 
          message: `Codice OTP inviato via SMS a ${maskedPhone}`,
        })
      } catch (smsError: any) {
        console.error("[v0] Error sending SMS:", smsError)
        return NextResponse.json({ error: smsError.message || "Failed to send SMS" }, { status: 500 })
      }
    } else {
      if (!currentEmail) {
        return NextResponse.json({ error: "Email not configured" }, { status: 400 })
      }
      
      try {
        const resend = getResend()
        if (!resend) {
          console.log(`[v0] RESEND_API_KEY not configured - OTP for email change: ${otp}`)
          return NextResponse.json({ 
            success: true, 
            message: "Email service non configurato. OTP loggato in console per testing.",
            devOtp: process.env.NODE_ENV === "development" ? otp : undefined
          })
        }
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: currentEmail,
          subject: "Codice di Verifica - Cambio Email",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Codice di Verifica</h2>
              <p>Hai richiesto di modificare l'email del tuo account amministratore.</p>
              <p>Il tuo codice di verifica è:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #666;">Questo codice scadrà tra 10 minuti.</p>
              <p style="color: #666;">Se non hai richiesto questa modifica, ignora questa email.</p>
            </div>
          `,
        })
        
        console.log(`[v0] Sent Email change OTP to ${currentEmail}: ${otp}`)
      } catch (emailError) {
        console.error("[v0] Error sending email:", emailError)
        return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
      }
      
      const maskedEmail = currentEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length))

      return NextResponse.json({ 
        success: true, 
        message: `Codice OTP inviato via email a ${maskedEmail}`,
      })
    }
  } catch (error) {
    console.error("[v0] Error sending email OTP:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}


