import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

export async function GET() {
  try {
    const roomsRef = collection(db, "rooms")
    const snapshot = await getDocs(roomsRef)

    const rooms = snapshot.docs.map((doc) => ({
      roomId: doc.id,
      roomName: doc.data().name,
      basePrice: doc.data().price || 150,
    }))

    return NextResponse.json(rooms)
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
  }
}
