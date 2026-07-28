import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { newEmail, otp } = await request.json()

    if (!newEmail || !otp) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    // Verify OTP
    const otpDoc = await db.collection("admin_otp").doc("email_change").get()
    const otpData = otpDoc.data()

    if (!otpData || otpData.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 })
    }

    if (otpData.expiresAt < Date.now()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 })
    }

    if (otpData.newEmail !== newEmail) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 })
    }

    // Get admin user (you'll need to implement proper session/auth logic)
    // For now, we'll get the first user with role "admin"
    const usersRef = db.collection("users")
    const adminSnapshot = await usersRef.where("role", "==", "admin").limit(1).get()
    
    if (adminSnapshot.empty) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const adminDoc = adminSnapshot.docs[0]
    const adminUid = adminDoc.id

    // Update email in Firebase Auth
    await auth.updateUser(adminUid, { email: newEmail })

    // Update email in Firestore
    await usersRef.doc(adminUid).update({ email: newEmail })

    // Delete OTP
    await db.collection("admin_otp").doc("email_change").delete()

    return NextResponse.json({ success: true, message: "Email updated successfully" })
  } catch (error) {
    console.error("[v0] Error updating email:", error)
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
  }
}
