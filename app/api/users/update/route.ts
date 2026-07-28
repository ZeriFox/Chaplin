import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName, phone, address } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const db = getAdminDb()
    const userRef = db.collection("users").doc(userId)

    // Check if user exists
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user document
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address

    // Update displayName if firstName or lastName changed
    if (firstName || lastName) {
      const currentData = userDoc.data()
      const newFirstName = firstName || currentData?.firstName || ""
      const newLastName = lastName || currentData?.lastName || ""
      updateData.displayName = `${newFirstName} ${newLastName}`.trim()
    }

    await userRef.update(updateData)

    console.log("[API] User updated successfully:", userId)

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    })
  } catch (error: any) {
    console.error("[API] Error updating user:", error)
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 })
  }
}
