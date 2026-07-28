import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { newPhone, otp } = await request.json()

    if (!newPhone || !otp) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const db = getAdminDb()

    // Verify OTP
    const otpDoc = await db.collection("admin_otp").doc("phone_change").get()
    const otpData = otpDoc.data()

    if (!otpData || otpData.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }

    if (otpData.expiresAt < Date.now()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 })
    }

    if (otpData.newPhone !== newPhone) {
      return NextResponse.json({ error: "Phone mismatch" }, { status: 400 })
    }

    // Get admin user
    const usersRef = db.collection("users")
    const adminSnapshot = await usersRef.where("role", "==", "admin").limit(1).get()
    
    if (adminSnapshot.empty) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const adminUid = adminSnapshot.docs[0].id

    // Update phone in Firestore
    await usersRef.doc(adminUid).update({ phone: newPhone })

    // Delete OTP
    await db.collection("admin_otp").doc("phone_change").delete()

    return NextResponse.json({ success: true, message: "Phone updated successfully" })
  } catch (error) {
    console.error("[v0] Error updating phone:", error)
    return NextResponse.json({ error: "Failed to update phone" }, { status: 500 })
  }
}
