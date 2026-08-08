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

function includesDate(from: unknown, to: unknown, date: string) {
  return String(from || "") <= date && date < String(to || "")
}

/* ============================================================================
 * SMOOBU DISABLED - Unblock dates now works ONLY on Firebase (no Smoobu sync)
 * ============================================================================ */

export async function POST(request: Request) {
  try {
    await requireAdminApi(request)
    const { blockId } = await request.json()

    if (!blockId) {
      return NextResponse.json({ error: "Missing blockId" }, { status: 400 })
    }

    const db = getAdminDb()
    const blockRef = db.collection("blocked_dates").doc(blockId)
    const blockDoc = await blockRef.get()

    if (!blockDoc.exists) {
      return NextResponse.json({ error: "Blocked date not found" }, { status: 404 })
    }

    const removedBlock = blockDoc.data()
    const roomId = String(removedBlock?.roomId || "")
    await blockRef.delete()

    let roomStatus: "available" | "booked" | "maintenance" = "available"
    if (roomId) {
      const [remainingBlocks, activeBookings] = await Promise.all([
        db.collection("blocked_dates").where("roomId", "==", roomId).get(),
        db.collection("bookings").where("status", "in", ["confirmed", "paid", "pending"]).get(),
      ])
      const today = currentItalianDate()
      const stillInMaintenance = remainingBlocks.docs.some((document) => {
        const data = document.data()
        return includesDate(data.from, data.to, today)
      })
      const occupiedToday = activeBookings.docs.some((document) => {
        const data = document.data()
        return includesDate(data.checkIn, data.checkOut, today)
      })

      roomStatus = stillInMaintenance ? "maintenance" : occupiedToday ? "booked" : "available"
      await db.collection("rooms").doc(roomId).set(
        { status: roomStatus, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
    }

    return NextResponse.json({
      success: true,
      roomStatus,
      smoobuSuccess: false,
      message: "Date sbloccate dal sito"
    })
  } catch (error) {
    console.error("[UnblockDates] Error unblocking dates:", error)
    return adminApiErrorResponse(error)
  }
}

/*
// ORIGINAL SMOOBU CODE - DO NOT DELETE
// The original code also called smoobuClient.unblockDates() to sync unblocks to Smoobu
// When re-enabling, restore the smoobuClient import and unblock logic
*/
