import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/* ============================================================================
 * SMOOBU DISABLED - Unblock dates now works ONLY on Firebase (no Smoobu sync)
 * ============================================================================ */

export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json()

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[UnblockDates] Unblocking dates for room ${roomId}: ${checkIn} to ${checkOut}`)

    const blockedDatesRef = collection(db, "blocked_dates")
    const q = query(
      blockedDatesRef,
      where("roomId", "==", roomId),
      where("from", "==", checkIn),
      where("to", "==", checkOut)
    )
    const snapshot = await getDocs(q)

    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref)
    }

    return NextResponse.json({
      success: true,
      smoobuSuccess: false,
      message: "Date sbloccate dal sito"
    })
  } catch (error) {
    console.error("[UnblockDates] Error unblocking booking dates:", error)
    return NextResponse.json({ error: "Failed to unblock dates" }, { status: 500 })
  }
}

/*
// ORIGINAL SMOOBU CODE - DO NOT DELETE
// The original code also called smoobuClient.unblockDates() to sync unblocks to Smoobu
// When re-enabling, restore the smoobuClient import and unblock logic
*/
