import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"

export const dynamic = 'force-dynamic'

/**
 * Get all blocked dates from Firestore
 */
export async function GET() {
  try {
    const blockedDatesRef = collection(db, "blocked_dates")
    const q = query(blockedDatesRef, orderBy("from", "asc"))
    const snapshot = await getDocs(q)

    const blockedDates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      blockedDates
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching blocked dates:", error)
    return NextResponse.json(
      { error: "Failed to fetch blocked dates" },
      { status: 500 }
    )
  }
}