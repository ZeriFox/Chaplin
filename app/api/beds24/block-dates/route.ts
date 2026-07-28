import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * Il codice originale e stato commentato. Riattivare quando necessario.
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 integration disabled" })
}

export async function POST() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 integration disabled" })
}

/*
// ORIGINAL BEDS24 BLOCK-DATES CODE - DO NOT DELETE
// This file blocked dates on Beds24 (syncing to Airbnb and Booking.com)
// When re-enabling, restore from git history
*/
