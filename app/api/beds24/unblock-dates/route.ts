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
// ORIGINAL BEDS24 UNBLOCK-DATES CODE - DO NOT DELETE
// This file unblocked dates on Beds24 and removed from Firestore
// When re-enabling, restore from git history
*/
