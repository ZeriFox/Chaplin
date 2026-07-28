import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 integration disabled" })
}

export async function POST() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 integration disabled" })
}

/*
// ORIGINAL BEDS24 UNBLOCK-BOOKING-DATES CODE - DO NOT DELETE
// This file unblocked dates on Beds24 when cancelling bookings
// When re-enabling, restore from git history
*/
