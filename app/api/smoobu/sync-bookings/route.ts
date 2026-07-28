import { NextResponse } from "next/server"

/* ============================================================================
 * SMOOBU DISABLED - Sito personale, nessuna sincronizzazione prenotazioni esterne
 * ============================================================================ */

export async function POST() {
  return NextResponse.json({ disabled: true, message: "Smoobu sync-bookings is currently disabled. Bookings are managed directly on the site." })
}

export async function GET() {
  return NextResponse.json({ disabled: true, message: "Smoobu sync-bookings is currently disabled. Bookings are managed directly on the site." })
}

/*
// ORIGINAL SMOOBU SYNC-BOOKINGS CODE - DO NOT DELETE
// This file contained the full sync logic that:
// 1. Fetched bookings from Smoobu API (Booking.com, Airbnb, Expedia, Direct)
// 2. Checked for duplicates in Firebase
// 3. Converted Smoobu apartment IDs to local room IDs
// 4. Saved new bookings to Firebase
// When re-enabling, restore from git history or uncomment the original code
*/
