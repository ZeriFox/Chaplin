import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"

export async function POST(request: Request) {
  try {
    const { roomId, checkIn, checkOut } = await request.json()

    if (!roomId || !checkIn || !checkOut) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const roomRef = doc(db, "rooms", roomId)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const basePrice = roomSnap.data().price || 150

    const seasonsRef = collection(db, "pricing_seasons")
    const seasonsSnap = await getDocs(seasonsRef)
    const seasons = seasonsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const periodsRef = collection(db, "pricing_special_periods")
    const periodsSnap = await getDocs(periodsRef)
    const specialPeriods = periodsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    const overridesRef = collection(db, "pricing_overrides")
    const overridesSnap = await getDocs(overridesRef)
    const overrides = overridesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    console.log("[v0] Loaded pricing data:", {
      seasons: seasons.length,
      specialPeriods: specialPeriods.length,
      overrides: overrides.length,
      basePrice,
    })

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

    let totalPrice = 0
    const priceBreakdown = []

    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate)
      currentDate.setDate(currentDate.getDate() + i)
      const dateStr = currentDate.toISOString().split("T")[0]

      const monthDay = dateStr.substring(5) // "12-25" from "2025-12-25"

      // Priority 1: Check for override
      const override = overrides.find((o: any) => o.roomId === roomId && o.date === dateStr)
      if (override) {
        totalPrice += override.price
        priceBreakdown.push({
          date: dateStr,
          price: override.price,
          type: "override",
          reason: override.reason,
        })
        console.log(`[v0] ${dateStr}: Override → €${override.price}`)
        continue
      }

      const specialPeriod = specialPeriods.find((p: any) => {
        // Parse dates without time to avoid timezone issues
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
        const startParts = p.startDate.split("-")
        const endParts = p.endDate.split("-")

        const start = new Date(
          Number.parseInt(startParts[0]),
          Number.parseInt(startParts[1]) - 1,
          Number.parseInt(startParts[2]),
        )
        const end = new Date(
          Number.parseInt(endParts[0]),
          Number.parseInt(endParts[1]) - 1,
          Number.parseInt(endParts[2]),
        )

        return checkDate >= start && checkDate <= end
      })

      if (specialPeriod) {
        const price = Math.round(basePrice * specialPeriod.priceMultiplier)
        totalPrice += price
        priceBreakdown.push({
          date: dateStr,
          price,
          type: "special",
          name: specialPeriod.name,
          multiplier: specialPeriod.priceMultiplier,
        })
        console.log(`[v0] ${dateStr}: Special "${specialPeriod.name}" (${specialPeriod.priceMultiplier}x) → €${price}`)
        continue
      }

      const season = seasons.find((s: any) => {
        const seasonStart = s.startDate // "11-01"
        const seasonEnd = s.endDate // "11-30"

        // Handle year-end wrap (e.g., 12-25 to 01-05)
        if (seasonStart <= seasonEnd) {
          // Normal range within same year
          return monthDay >= seasonStart && monthDay <= seasonEnd
        } else {
          // Wrap around year end (e.g., 12-25 to 01-05)
          return monthDay >= seasonStart || monthDay <= seasonEnd
        }
      })

      if (season) {
        const price = Math.round(basePrice * season.priceMultiplier)
        totalPrice += price
        priceBreakdown.push({
          date: dateStr,
          price,
          type: "season",
          name: season.name,
          multiplier: season.priceMultiplier,
        })
        console.log(`[v0] ${dateStr}: Season "${season.name}" (${season.priceMultiplier}x) → €${price}`)
        continue
      }

      // Priority 4: Base price
      totalPrice += basePrice
      priceBreakdown.push({
        date: dateStr,
        price: basePrice,
        type: "base",
      })
      console.log(`[v0] ${dateStr}: Base price → €${basePrice}`)
    }

    return NextResponse.json({
      totalPrice,
      nights,
      averagePerNight: Math.round(totalPrice / nights),
      priceBreakdown,
    })
  } catch (error) {
    console.error("Error calculating dynamic price:", error)
    return NextResponse.json({ error: "Failed to calculate price" }, { status: 500 })
  }
}


