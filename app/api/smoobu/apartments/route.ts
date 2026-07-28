import { NextResponse } from "next/server"

/* ============================================================================
 * SMOOBU/BEDS24 DISABLED - Sito personale, nessuna integrazione esterna
 * Il codice originale e stato commentato. Riattivare quando necessario.
 * ============================================================================ */

export async function GET() {
  return NextResponse.json({ disabled: true, message: "Smoobu integration is currently disabled" })
}

/*
// ORIGINAL CODE - DO NOT DELETE
import { smoobuClient } from "@/lib/smoobu-client"

export async function GET() {
  try {
    const apartments = await smoobuClient.getApartments()
    console.log("[Smoobu] Apartments found:", apartments.map(a => ({ id: a.id, name: a.name })))
    return NextResponse.json({
      success: true,
      apartments: apartments.map(a => ({
        id: a.id, name: a.name, type: a.type?.name || "unknown",
        location: a.location?.city || "", country: a.location?.country || "",
        maxOccupancy: a.rooms?.maxOccupancy || 0, bedrooms: a.rooms?.bedrooms || 0, bathrooms: a.rooms?.bathrooms || 0,
      })),
      count: apartments.length,
    })
  } catch (error) {
    console.error("[Smoobu] Error fetching apartments:", error)
    return NextResponse.json({ error: "Failed to fetch apartments", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
*/
