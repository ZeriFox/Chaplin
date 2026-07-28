import { NextResponse } from "next/server"
import { sendBookingConfirmationEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 })
    }

    console.log("[Test Email] Testing email send to:", email)

    // Send test email with dummy data
    const result = await sendBookingConfirmationEmail({
      to: email,
      bookingId: "TEST-" + Date.now(),
      firstName: "Test",
      lastName: "User",
      checkIn: new Date().toISOString().split("T")[0],
      checkOut: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      roomName: "Deluxe Suite (Test)",
      guests: 2,
      totalAmount: 25000, // €250.00
      nights: 2,
      newUserPassword: "TestPassword123!",
    })

    if (result.success) {
      console.log("[Test Email] ✅ Test email sent successfully")
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        emailId: result.emailId,
      })
    } else {
      console.error("[Test Email] ❌ Test email failed:", result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[Test Email] ❌ Error:", error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Email test endpoint. Use POST with { email: 'your@email.com' } to test.",
    configured: {
      resendApiKey: !!process.env.RESEND_API_KEY,
      resendFromEmail: !!process.env.RESEND_FROM_EMAIL,
      fromEmail: process.env.RESEND_FROM_EMAIL,
    },
  })
}
