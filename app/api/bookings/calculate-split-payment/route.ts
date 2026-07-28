import { type NextRequest, NextResponse } from "next/server"
import { calculatePaymentSchedule } from "@/lib/payment-logic"

export async function POST(request: NextRequest) {
  try {
    const { totalAmount, checkInDate } = await request.json()

    if (!totalAmount || !checkInDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const schedule = calculatePaymentSchedule(totalAmount, new Date(checkInDate))

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error calculating payment schedule:", error)
    return NextResponse.json({ error: "Failed to calculate payment schedule" }, { status: 500 })
  }
}
