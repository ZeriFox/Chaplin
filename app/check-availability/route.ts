import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function overlaps(start: string, end: string, existingStart: string, existingEnd: string) {
  return existingStart < end && existingEnd > start
}

export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json()
    const start = String(checkIn ?? "").slice(0, 10)
    const end = String(checkOut ?? "").slice(0, 10)

    if (String(roomId) !== "2" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start >= end) {
      return NextResponse.json({ error: "Date non valide" }, { status: 400 })
    }

    const db = getAdminDb()
    const [bookings, blocks, calendar] = await Promise.all([
      db.collection("bookings").where("roomId", "==", "2").get(),
      db.collection("blocked_dates").where("roomId", "==", "2").get(),
      db.collection("suite_calendar").where("roomId", "==", "2").get(),
    ])

    const bookingConflict = bookings.docs.some((document) => {
      const booking = document.data()
      return booking.status !== "cancelled" && overlaps(start, end, String(booking.checkIn ?? ""), String(booking.checkOut ?? ""))
    })

    if (bookingConflict) return NextResponse.json({ available: false, reason: "booking" })

    const explicitAvailability = new Map<string, boolean>()
    calendar.forEach((document) => {
      const day = document.data()
      if (typeof day.date === "string" && typeof day.available === "boolean") {
        explicitAvailability.set(day.date, day.available)
      }
    })

    for (const date = new Date(`${start}T00:00:00Z`); date < new Date(`${end}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
      const dateKey = date.toISOString().slice(0, 10)
      if (explicitAvailability.get(dateKey) === false) {
        return NextResponse.json({ available: false, reason: "closed" })
      }

      if (explicitAvailability.get(dateKey) !== true) {
        const blocked = blocks.docs.some((document) => {
          const block = document.data()
          return dateKey >= String(block.from ?? "") && dateKey < String(block.to ?? "")
        })
        if (blocked) return NextResponse.json({ available: false, reason: "closed" })
      }
    }

    return NextResponse.json({ available: true })
  } catch (error) {
    console.error("[Availability] Check error:", error)
    return NextResponse.json({ error: "Impossibile verificare la disponibilità" }, { status: 500 })
  }
}
