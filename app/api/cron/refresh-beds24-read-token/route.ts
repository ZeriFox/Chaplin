import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/* ============================================================================
 * BEDS24 CRON DISABLED - Sito personale, nessuna integrazione esterna
 * ============================================================================ */

export async function GET() {
  return NextResponse.json({ disabled: true, message: "Beds24 read token refresh cron is currently disabled" })
}

/*
// ORIGINAL BEDS24 READ TOKEN REFRESH CRON - DO NOT DELETE
// When re-enabling, restore from git history
*/
