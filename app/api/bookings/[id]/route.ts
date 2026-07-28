import { type NextRequest, NextResponse } from "next/server"
import { getBookingById } from "@/lib/firebase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookingId = params.id

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    const booking = await getBookingById(bookingId)

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error: any) {
    console.error("[API] Error fetching booking:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch booking" }, { status: 500 })
  }
}
