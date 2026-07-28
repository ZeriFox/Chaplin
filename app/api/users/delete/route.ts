import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin"

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email } = body

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email are required" }, { status: 400 })
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    // Verify user exists and email matches
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    if (userData?.email !== email) {
      return NextResponse.json({ error: "Email does not match" }, { status: 403 })
    }

    // Delete all user's bookings (past bookings only, not upcoming)
    const bookingsSnapshot = await db.collection("bookings").where("userId", "==", userId).get()

    const today = new Date().toISOString().split("T")[0]
    const batch = db.batch()

    bookingsSnapshot.docs.forEach((doc) => {
      const booking = doc.data()
      // Only delete past bookings
      if (booking.checkOut < today) {
        batch.delete(doc.ref)
      }
    })

    await batch.commit()

    // Delete user document from Firestore
    await db.collection("users").doc(userId).delete()

    // Delete user from Firebase Auth
    try {
      await auth.deleteUser(userId)
    } catch (authError) {
      console.error("[API] Error deleting user from Auth:", authError)
      // Continue even if auth deletion fails
    }

    console.log("[API] User and past bookings deleted successfully:", userId)

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    })
  } catch (error: any) {
    console.error("[API] Error deleting user:", error)
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 })
  }
}
