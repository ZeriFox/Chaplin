import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function addRange(target: Set<string>, from: string, to: string) {
  const start = new Date(`${from.slice(0, 10)}T00:00:00Z`)
  const end = new Date(`${to.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return

  for (const date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
    target.add(date.toISOString().slice(0, 10))
  }
}

export async function GET() {
  try {
    const db = getAdminDb()
    const [bookingsSnapshot, blockedSnapshot, calendarSnapshot] = await Promise.all([
      db.collection("bookings").where("status", "in", ["confirmed", "paid", "pending"]).get(),
      db.collection("blocked_dates").where("roomId", "==", "2").get(),
      db.collection("suite_calendar").where("roomId", "==", "2").get(),
    ])

    const bookingDates = new Set<string>()
    const manuallyClosedDates = new Set<string>()
    const explicitlyOpenDates = new Set<string>()

    bookingsSnapshot.forEach((document) => {
      const booking = document.data()
      if (!booking.roomId || String(booking.roomId) === "2") {
        addRange(bookingDates, String(booking.checkIn ?? ""), String(booking.checkOut ?? ""))
      }
    })

    blockedSnapshot.forEach((document) => {
      const block = document.data()
      addRange(manuallyClosedDates, String(block.from ?? ""), String(block.to ?? ""))
    })

    calendarSnapshot.forEach((document) => {
      const day = document.data()
      if (typeof day.date !== "string") return
      if (day.available === false) manuallyClosedDates.add(day.date)
      if (day.available === true) explicitlyOpenDates.add(day.date)
    })

    explicitlyOpenDates.forEach((date) => manuallyClosedDates.delete(date))
    const dates = [...new Set([...bookingDates, ...manuallyClosedDates])].sort()

    return NextResponse.json({ dates })
  } catch (error) {
    console.error("[Unavailable Dates] Read error:", error)
    return NextResponse.json({ error: "Errore nel recupero delle date" }, { status: 500 })
  }
}
