import { NextResponse } from "next/server"

/* ============================================================================
 * BEDS24 DISABLED - Sito personale, nessuna sincronizzazione prenotazioni esterne
 * ============================================================================ */

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 sync-bookings disabled" })
}

export async function GET() {
  return NextResponse.json({ disabled: true, provider: "beds24", message: "Beds24 sync-bookings disabled" })
}

/*
// ORIGINAL BEDS24 SYNC-BOOKINGS CODE - DO NOT DELETE
// This file synced bookings from Beds24 to Firebase
// When re-enabling, restore from git history
*/
