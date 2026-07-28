import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 integration disabled" })
}

/*
// ORIGINAL BEDS24 BLOCKED-DATES CODE - DO NOT DELETE
// This file fetched blocked dates from Firestore for Beds24
// When re-enabling, restore from git history
*/
