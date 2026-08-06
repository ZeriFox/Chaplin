import { NextResponse } from "next/server"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"

import { db } from "@/lib/firebase"

const SUITE_ROOM_ID = "2"
const SUITE_DEFAULT_PRICE = 150

type StoredOverride = { price?: number; reason?: string }

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

function dateToStorageKey(date: string) {
  return `d_${date.replace(/-/g, "_")}`
}

async function safeCollection(name: string) {
  try {
    const snapshot = await getDocs(collection(db, name))
    return snapshot.docs.map((item) => item.data() as any)
  } catch (error) {
    console.warn(`[calculate-price] Optional collection ${name} unavailable`, error)
    return []
  }
}

async function safeLegacyOverrides(roomId: string) {
  try {
    const snapshot = await getDocs(query(collection(db, "pricing_overrides"), where("roomId", "==", roomId)))
    return snapshot.docs.map((item) => item.data() as any)
  } catch (error) {
    console.warn("[calculate-price] Legacy overrides unavailable", error)
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { checkIn, checkOut, roomId } = await request.json()
    if (!checkIn || !checkOut) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })

    const finalRoomId = String(roomId || SUITE_ROOM_ID)
    const start = parseUtcDate(checkIn)
    const end = parseUtcDate(checkOut)
    const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    if (nights < 1) return NextResponse.json({ error: "Le date non sono valide" }, { status: 400 })

    let basePrice = SUITE_DEFAULT_PRICE
    let roomOverrides: Record<string, StoredOverride> = {}

    try {
      const roomSnapshot = await getDoc(doc(db, "rooms", finalRoomId))
      if (roomSnapshot.exists()) {
        const roomData = roomSnapshot.data()
        const storedPrice = Number(roomData.price)
        if (Number.isFinite(storedPrice) && storedPrice > 0) basePrice = storedPrice
        if (roomData.priceOverrides && typeof roomData.priceOverrides === "object") {
          roomOverrides = roomData.priceOverrides as Record<string, StoredOverride>
        }
      }
    } catch (error) {
      console.warn("[calculate-price] Using default Suite price", error)
    }

    const [seasons, specialPeriods, legacyOverrides] = await Promise.all([
      safeCollection("pricing_seasons"),
      safeCollection("pricing_special_periods"),
      safeLegacyOverrides(finalRoomId),
    ])

    const priceBreakdown: Array<{ date: string; price: number; source: string; label: string }> = []
    let totalPrice = 0

    for (let index = 0; index < nights; index += 1) {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + index)
      const dateString = date.toISOString().slice(0, 10)
      const embeddedOverride = roomOverrides[dateToStorageKey(dateString)] || roomOverrides[dateString]
      const embeddedPrice = Number(embeddedOverride?.price)

      if (Number.isFinite(embeddedPrice) && embeddedPrice > 0) {
        totalPrice += embeddedPrice
        priceBreakdown.push({
          date: dateString,
          price: embeddedPrice,
          source: "manual",
          label: embeddedOverride?.reason || "Prezzo manuale",
        })
        continue
      }

      const legacyOverride = legacyOverrides.find((item) => item.date === dateString)
      if (legacyOverride) {
        const price = Number(legacyOverride.price)
        totalPrice += price
        priceBreakdown.push({ date: dateString, price, source: "manual", label: legacyOverride.reason || "Prezzo manuale" })
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
