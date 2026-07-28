import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"

function isDateInRecurringSeason(date: Date, startMMDD: string, endMMDD: string): boolean {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const dateMMDD = `${month}-${day}`

  // Handle seasons that cross year boundary (e.g., 12-20 to 01-10)
  if (startMMDD > endMMDD) {
    return dateMMDD >= startMMDD || dateMMDD <= endMMDD
  }

  return dateMMDD >= startMMDD && dateMMDD <= endMMDD
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, checkIn, checkOut, roomId } = await request.json()

    if (!checkIn || !checkOut) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    // Calculate nights
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    if (nights < 1) {
      return NextResponse.json({ error: "Le date non sono valide" }, { status: 400 })
    }

    let finalRoomId = roomId

    // If bookingId provided, get room from booking
    if (bookingId && !roomId) {
      const bookingRef = doc(db, "bookings", bookingId)
      const bookingSnap = await getDoc(bookingRef)

      if (!bookingSnap.exists()) {
        return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 })
      }

      const booking = bookingSnap.data()
      finalRoomId = booking.roomId
    }

    if (!finalRoomId) {
      return NextResponse.json({ error: "Room ID mancante" }, { status: 400 })
    }

    // Get room base price
    const roomRef = doc(db, "rooms", finalRoomId)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Camera non trovata" }, { status: 404 })
    }

    const room = roomSnap.data()
    const basePrice = room.price || 0

    // Get all pricing rules
    const seasonsSnapshot = await getDocs(collection(db, "pricing_seasons"))
    const seasons = seasonsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const periodsSnapshot = await getDocs(collection(db, "pricing_special_periods"))
    const specialPeriods = periodsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const overridesSnapshot = await getDocs(
      query(collection(db, "pricing_overrides"), where("roomId", "==", finalRoomId)),
    )
    const overrides = overridesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Calculate price for each night
    let totalPrice = 0
    const currentDate = new Date(checkInDate)

    while (currentDate < checkOutDate) {
      const dateStr = currentDate.toISOString().split("T")[0]

      // Check override first (highest priority)
      const override = overrides.find((o: any) => o.date === dateStr)
      if (override) {
        totalPrice += override.price
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Check special period (second priority) - uses full dates YYYY-MM-DD
      const specialPeriod = specialPeriods.find((p: any) => {
        const pStart = p.startDate.split("T")[0]
        const pEnd = p.endDate.split("T")[0]
        return dateStr >= pStart && dateStr <= pEnd
      })

      if (specialPeriod) {
        totalPrice += Math.round(basePrice * specialPeriod.priceMultiplier)
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const season = seasons.find((s: any) => {
        return isDateInRecurringSeason(currentDate, s.startDate, s.endDate)
      })

      if (season) {
        totalPrice += Math.round(basePrice * season.priceMultiplier)
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Base price (lowest priority)
      totalPrice += basePrice
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(
      `[v0] Calculated price for ${nights} nights: €${totalPrice} (base: €${basePrice}, avg: €${Math.round(totalPrice / nights)}/night)`,
    )

    return NextResponse.json({
      newPrice: totalPrice,
      nights,
      pricePerNight: Math.round(totalPrice / nights),
      basePrice,
    })
  } catch (error) {
    console.error("Error calculating price:", error)
    return NextResponse.json({ error: "Errore nel calcolo del prezzo" }, { status: 500 })
  }
}
