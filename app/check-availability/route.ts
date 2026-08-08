import { NextResponse } from "next/server"
import { checkServerAvailability } from "@/lib/booking-inventory"
import { BookingConflictError } from "@/lib/booking-rules"
import { SUITE_ROOM_ID } from "@/lib/suite-room"

/**
 * Check room availability for booking
 * Respects booking priority: Booking.com > Airbnb > Site
 */
export async function POST(request: Request) {
  try {
    const { checkIn, checkOut } = await request.json()
    const roomId = SUITE_ROOM_ID

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[v0] Checking availability for room ${roomId}: ${checkIn} to ${checkOut}`)

    // Check for conflicts with existing bookings
    return NextResponse.json(await checkServerAvailability({ roomId, checkIn, checkOut }))
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return NextResponse.json({ available: false, error: error.message }, { status: error.status })
    }
    console.error("[v0] Error checking availability:", error)
    return NextResponse.json(
      { error: "Failed to check availability", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
