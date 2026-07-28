import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 test-airbnb disabled" })
}

/*
// ORIGINAL BEDS24 TEST-AIRBNB CODE - DO NOT DELETE
// This file tested Airbnb bookings via Beds24 API
// When re-enabling, restore from git history
*/
