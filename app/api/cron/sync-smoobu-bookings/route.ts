import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/* ============================================================================
 * SMOOBU CRON DISABLED - Sito personale, nessuna sincronizzazione esterna
 * ============================================================================ */

export async function GET() {
  return NextResponse.json({ disabled: true, message: "Smoobu sync cron is currently disabled" })
}

/*
// ORIGINAL SMOOBU CRON SYNC CODE - DO NOT DELETE
// This cron job ran every 2 hours and:
// 1. Fetched bookings from Smoobu (Booking.com, Airbnb, direct)
// 2. Synced them to Firebase
// 3. Auto-blocked dates for confirmed bookings
// 4. Unblocked dates for cancelled bookings
// 5. Blocked past dates
// When re-enabling, restore from git history
*/
