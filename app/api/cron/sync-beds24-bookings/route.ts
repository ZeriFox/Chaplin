import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/* ============================================================================
 * BEDS24 CRON DISABLED - Sito personale, nessuna sincronizzazione esterna
 * ============================================================================ */

export async function GET() {
  return NextResponse.json({ disabled: true, message: "Beds24 sync cron is currently disabled" })
}

/*
// ORIGINAL BEDS24 CRON SYNC CODE - DO NOT DELETE
// This cron job synced bookings from Beds24 and managed date blocking
// When re-enabling, restore from git history
*/
