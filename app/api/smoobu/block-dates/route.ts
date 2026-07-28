import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/* ============================================================================
 * SMOOBU DISABLED - Block dates now saves ONLY to Firebase (no Smoobu sync)
 * ============================================================================ */

export async function POST(request: Request) {
  try {
    const { roomId, from, to, reason } = await request.json()

    if (!roomId || !from || !to) {
      return NextResponse.json({ error: "Missing required fields: roomId, from, to" }, { status: 400 })
    }

    console.log(`[BlockDates] Blocking dates for room ${roomId}: ${from} to ${to}, reason: ${reason}`)

    // Save to Firestore only (Smoobu sync disabled)
    const blockedDatesRef = collection(db, "blocked_dates")
    await addDoc(blockedDatesRef, {
      roomId,
      from,
      to,
      reason: reason || "maintenance",
      createdAt: serverTimestamp(),
      syncedToSmoobu: false,
      smoobuReservationId: null,
      smoobuError: "Smoobu integration disabled",
    })

    return NextResponse.json({
      success: true,
      smoobuSuccess: false,
      message: "Date bloccate con successo sul sito",
    })
  } catch (error) {
    console.error("[BlockDates] Error blocking dates:", error)
    return NextResponse.json(
      { error: "Failed to block dates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

/*
// ORIGINAL SMOOBU CODE - DO NOT DELETE
// import { smoobuClient } from "@/lib/smoobu-client"
// The original code called smoobuClient.blockDates() to sync to Smoobu/Airbnb/Booking.com
// When re-enabling, restore the smoobuClient import and the try/catch block that calls it
*/
