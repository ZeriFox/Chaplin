import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, deleteDoc, getDoc } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/* ============================================================================
 * SMOOBU DISABLED - Unblock dates now works ONLY on Firebase (no Smoobu sync)
 * ============================================================================ */

export async function POST(request: Request) {
  try {
    const { blockId } = await request.json()

    if (!blockId) {
      return NextResponse.json({ error: "Missing blockId" }, { status: 400 })
    }

    const blockRef = doc(db, "blocked_dates", blockId)
    const blockDoc = await getDoc(blockRef)

    if (!blockDoc.exists()) {
      return NextResponse.json({ error: "Blocked date not found" }, { status: 404 })
    }

    await deleteDoc(blockRef)

    return NextResponse.json({
      success: true,
      smoobuSuccess: false,
      message: "Date sbloccate dal sito"
    })
  } catch (error) {
    console.error("[UnblockDates] Error unblocking dates:", error)
    return NextResponse.json({ error: "Failed to unblock dates" }, { status: 500 })
  }
}

/*
// ORIGINAL SMOOBU CODE - DO NOT DELETE
// The original code also called smoobuClient.unblockDates() to sync unblocks to Smoobu
// When re-enabling, restore the smoobuClient import and unblock logic
*/
