import { NextResponse } from "next/server"

/* ============================================================================
 * SMOOBU DISABLED - Sito personale, nessuna sincronizzazione recensioni esterne
 * ============================================================================ */

export async function POST() {
  return NextResponse.json({ disabled: true, message: "Smoobu sync-reviews is currently disabled" })
}

export async function GET() {
  return NextResponse.json({ disabled: true, message: "Smoobu sync-reviews is currently disabled" })
}

/*
// ORIGINAL SMOOBU SYNC-REVIEWS CODE - DO NOT DELETE
// This file synced reviews from Smoobu (Booking.com and Airbnb) to Firebase
// When re-enabling, restore from git history
*/
