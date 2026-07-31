import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/email-transport"

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { newPhone } = await request.json()

    if (!newPhone) {
      return NextResponse.json({ error: "Missing newPhone" }, { status: 400 })
    }

    const db = getAdminDb()
    
    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store OTP in Firestore
    await db.collection("admin_otp").doc("phone_change").set({
      otp,
      newPhone,
      type: "phone",
      expiresAt,
      createdAt: Date.now(),
    })

    // Get admin email to send OTP
    const usersRef = db.collection("users")
    const adminSnapshot = await usersRef.where("role", "==", "admin").limit(1).get()
    
    if (adminSnapshot.empty) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const adminEmail = adminSnapshot.docs[0].data().email

    // Send OTP via email
    await sendEmail({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: adminEmail,
      subject: "Codice OTP per Cambio Numero di Telefono",
      html: `
        <h2>Codice OTP per Cambio Numero</h2>
        <p>Il tuo codice OTP è: <strong>${otp}</strong></p>
        <p>Questo codice scadrà tra 10 minuti.</p>
        <p>Nuovo numero: ${newPhone}</p>
      `,
    })

    console.log(`[v0] Phone change OTP sent to ${adminEmail}: ${otp}`)

    return NextResponse.json({ success: true, message: "OTP sent via email" })
  } catch (error) {
    console.error("[v0] Error sending phone OTP:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}
