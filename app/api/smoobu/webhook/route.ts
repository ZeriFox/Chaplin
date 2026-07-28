import { NextResponse } from "next/server"

/* ============================================================================
 * SMOOBU DISABLED - Webhook non attivo
 * ============================================================================ */

export async function POST() {
  return NextResponse.json({ disabled: true, message: "Smoobu webhook is currently disabled" })
}

/*
// ORIGINAL SMOOBU WEBHOOK CODE - DO NOT DELETE
// This file handled real-time booking updates from Smoobu webhooks
// Actions: newReservation, updateReservation, cancelReservation
// When re-enabling, restore from git history
*/
