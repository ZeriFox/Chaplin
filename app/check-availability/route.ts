import { NextResponse } from "next/server"
import { checkBookingConflicts } from "@/lib/booking-utils"

/**
 * Check room availability for booking
 * Respects booking priority: Booking.com > Airbnb > Site
 */
export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json()

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[v0] Checking availability for room ${roomId}: ${checkIn} to ${checkOut}`)

    // Check for conflicts with existing bookings
    const { hasConflict, conflictingBooking } = await checkBookingConflicts(roomId, checkIn, checkOut, "site")

    if (hasConflict) {
      return NextResponse.json({
        available: false,
        conflict: {
          source: conflictingBooking?.origin,
          checkIn: conflictingBooking?.checkIn,
          checkOut: conflictingBooking?.checkOut,
        },
      })
    }

    return NextResponse.json({
      available: true,
    })
  } catch (error) {
    console.error("[v0] Error checking availability:", error)
    return NextResponse.json(
      { error: "Failed to check availability", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
