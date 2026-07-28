import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna sincronizzazione recensioni esterne
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 sync-reviews disabled" })
}

export async function GET() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 sync-reviews disabled" })
}

/*
// ORIGINAL BEDS24 SYNC-REVIEWS CODE - DO NOT DELETE
// This file synced reviews from Beds24 (Booking.com and Airbnb) to Firebase
// When re-enabling, restore from git history
*/
