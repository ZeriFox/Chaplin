import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 integration disabled" })
}

/*
// ORIGINAL BEDS24 REFRESH-TOKEN CODE - DO NOT DELETE
// This file refreshed Beds24 write tokens
// When re-enabling, restore from git history
*/
