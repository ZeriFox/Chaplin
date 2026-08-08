import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function currentItalianDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/* ============================================================================
 * SMOOBU DISABLED - Block dates now saves ONLY to Firebase (no Smoobu sync)
 * ============================================================================ */

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const { roomId, from, to, reason } = await request.json()

    if (!roomId || !from || !to) {
      return NextResponse.json({ error: "Missing required fields: roomId, from, to" }, { status: 400 })
    }

    console.log(`[BlockDates] Blocking dates for room ${roomId}: ${from} to ${to}, reason: ${reason}`)

    // Save to Firestore only (Smoobu sync disabled)
    const db = getAdminDb()
    const blockedDate = await db.collection("blocked_dates").add({
      roomId,
      from,
      to,
      reason: reason || "maintenance",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: admin.uid,
      syncedToSmoobu: false,
      smoobuReservationId: null,
      smoobuError: "Smoobu integration disabled",
    })

    const today = currentItalianDate()
    if (from <= today && today < to) {
      await db.collection("rooms").doc(String(roomId)).set(
        { status: "maintenance", updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
    }

    return NextResponse.json({
      success: true,
      blockId: blockedDate.id,
      smoobuSuccess: false,
      message: "Date bloccate con successo sul sito",
    })
  } catch (error) {
    console.error("[BlockDates] Error blocking dates:", error)
    return adminApiErrorResponse(error)
  }
}

/*
// ORIGINAL SMOOBU CODE - DO NOT DELETE
// import { smoobuClient } from "@/lib/smoobu-client"
// The original code called smoobuClient.blockDates() to sync to Smoobu/Airbnb/Booking.com
// When re-enabling, restore the smoobuClient import and the try/catch block that calls it
*/
