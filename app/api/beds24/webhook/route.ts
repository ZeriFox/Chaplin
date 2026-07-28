import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 webhook disabled" })
}

/*
// ORIGINAL BEDS24 WEBHOOK CODE - DO NOT DELETE
// This file handled real-time booking updates from Beds24 webhooks
// When re-enabling, restore from git history
*/
