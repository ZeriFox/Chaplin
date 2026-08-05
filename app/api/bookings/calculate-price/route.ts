import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

function isDateInRecurringSeason(date: Date, startMMDD: string, endMMDD: string) {
  const monthDay = `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
  return startMMDD <= endMMDD
    ? monthDay >= startMMDD && monthDay <= endMMDD
    : monthDay >= startMMDD || monthDay <= endMMDD
}

function parseUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

export async function POST(request: Request) {
  try {
    const { bookingId, checkIn, checkOut, roomId } = await request.json()
    if (!checkIn || !checkOut) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })

    const db = getAdminDb()
    let finalRoomId = roomId
    if (bookingId && !finalRoomId) {
      const booking = await db.doc(`bookings/${bookingId}`).get()
      if (!booking.exists) return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
      finalRoomId = booking.data()?.roomId
    }
    if (!finalRoomId) return NextResponse.json({ error: "Room ID mancante" }, { status: 400 })

    const start = parseUtcDate(checkIn)
    const end = parseUtcDate(checkOut)
    const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    if (nights < 1) return NextResponse.json({ error: "Le date non sono valide" }, { status: 400 })

    const [roomSnapshot, seasonsSnapshot, periodsSnapshot, overridesSnapshot] = await Promise.all([
      db.doc(`rooms/${finalRoomId}`).get(),
      db.collection("pricing_seasons").get(),
      db.collection("pricing_special_periods").get(),
      db.collection("pricing_overrides").where("roomId", "==", finalRoomId).get(),
    ])

    if (!roomSnapshot.exists) return NextResponse.json({ error: "Camera non trovata" }, { status: 404 })

    const basePrice = Number(roomSnapshot.data()?.price || 0)
    const seasons = seasonsSnapshot.docs.map((doc) => doc.data() as any)
    const specialPeriods = periodsSnapshot.docs.map((doc) => doc.data() as any)
    const overrides = overridesSnapshot.docs.map((doc) => doc.data() as any)
    const priceBreakdown: Array<{ date: string; price: number; source: string; label: string }> = []
    let totalPrice = 0

    for (let index = 0; index < nights; index += 1) {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + index)
      const dateString = date.toISOString().slice(0, 10)

      const override = overrides.find((item) => item.date === dateString)
      if (override) {
        const price = Number(override.price)
        totalPrice += price
        priceBreakdown.push({ date: dateString, price, source: "manual", label: override.reason || "Prezzo manuale" })
        continue
      }

      const special = specialPeriods.find((item) => dateString >= item.startDate && dateString <= item.endDate)
      if (special) {
        const price = Math.round(basePrice * Number(special.priceMultiplier))
        totalPrice += price
        priceBreakdown.push({ date: dateString, price, source: "special", label: special.name })
        continue
      }

      const season = seasons.find((item) => isDateInRecurringSeason(date, item.startDate, item.endDate))
      if (season) {
        const price = Math.round(basePrice * Number(season.priceMultiplier))
        totalPrice += price
        priceBreakdown.push({ date: dateString, price, source: "season", label: season.name })
        continue
      }

      totalPrice += basePrice
      priceBreakdown.push({ date: dateString, price: basePrice, source: "base", label: "Prezzo base" })
    }

    const pricePerNight = totalPrice / nights
    return NextResponse.json({
      newPrice: totalPrice,
      totalPrice,
      totalAmount: Math.round(totalPrice * 100),
      nights,
      pricePerNight,
      basePrice,
      priceBreakdown,
    })
  } catch (error) {
    console.error("Error calculating price:", error)
    return NextResponse.json({ error: "Errore nel calcolo del prezzo" }, { status: 500 })
  }
}
