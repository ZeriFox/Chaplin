import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Get all blocked dates from Firestore
 */
export async function GET(request: Request) {
  try {
    await requireAdminApi(request)
    const snapshot = await getAdminDb().collection("blocked_dates").orderBy("from", "asc").get()

    const blockedDates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      blockedDates
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching blocked dates:", error)
    return adminApiErrorResponse(error)
  }
}
