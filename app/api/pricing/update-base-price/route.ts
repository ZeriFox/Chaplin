import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    const { roomId, basePrice } = await request.json()

    if (!roomId || !basePrice || basePrice <= 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const roomRef = doc(db, "rooms", roomId)
    await updateDoc(roomRef, {
      price: basePrice,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating base price:", error)
    return NextResponse.json({ error: "Failed to update base price" }, { status: 500 })
  }
}

