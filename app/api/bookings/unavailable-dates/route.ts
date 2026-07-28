import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb()
    const bookingsRef = db.collection("bookings")

    // Get all confirmed/paid bookings
    const snapshot = await bookingsRef.where("status", "in", ["confirmed", "paid", "pending"]).get()

    const unavailableDates: string[] = []

    snapshot.forEach((doc) => {
      const booking = doc.data()
      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)

      // Add all dates between check-in and check-out
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        unavailableDates.push(d.toISOString().split("T")[0])
      }
    })

    return NextResponse.json({ dates: [...new Set(unavailableDates)] })
  } catch (error) {
    console.error("Error fetching unavailable dates:", error)
    return NextResponse.json({ error: "Errore nel recupero delle date" }, { status: 500 })
  }
}
