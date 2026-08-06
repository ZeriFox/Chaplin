import { NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"

import { db } from "@/lib/firebase"

export const dynamic = "force-dynamic"
export const revalidate = 0

const SUITE_ROOM_ID = "2"
const SUITE_DEFAULT_PRICE = 150

export async function GET() {
  let roomName = "La Suite"
  let basePrice = SUITE_DEFAULT_PRICE

  try {
    const snapshot = await getDoc(doc(db, "rooms", SUITE_ROOM_ID))
    if (snapshot.exists()) {
      const data = snapshot.data()
      const storedPrice = Number(data.price)
      roomName = String(data.name || roomName)
      if (Number.isFinite(storedPrice) && storedPrice > 0) basePrice = storedPrice
    }
  } catch (error) {
    // The admin panel can create the document through the authenticated client.
    // Keep returning the Suite here so one optional pricing read never hides it.
    console.warn("[pricing/rooms] Using Suite fallback:", error)
  }

  return NextResponse.json(
    [{ roomId: SUITE_ROOM_ID, roomName, basePrice }],
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  )
}
