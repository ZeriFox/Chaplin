import "server-only"

import { getAdminDb } from "@/lib/firebase-admin"

const SUITE_ROOM_ID = "2"
const SUITE_DEFAULT_PRICE = 150

type StoredOverride = { price?: number; reason?: string }

type PriceBreakdownItem = {
  date: string
  price: number
  source: "manual" | "special" | "season" | "base"
  label: string
}

function parseUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseUtcDate(value).getTime())
}

function dateToStorageKey(date: string) {
  return `d_${date.replace(/-/g, "_")}`
}

function isDateInRecurringSeason(date: Date, startMMDD: string, endMMDD: string) {
  const monthDay = `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
  return startMMDD <= endMMDD
    ? monthDay >= startMMDD && monthDay <= endMMDD
    : monthDay >= startMMDD || monthDay <= endMMDD
}

async function readCollection(name: string) {
  try {
    const snapshot = await getAdminDb().collection(name).get()
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as any)
  } catch (error) {
    console.warn(`[pricing-engine] Optional collection ${name} unavailable`, error)
    return []
  }
}

export async function calculateBookingPrice({
  roomId = SUITE_ROOM_ID,
  checkIn,
  checkOut,
}: {
  roomId?: string
  checkIn: string
  checkOut: string
}) {
  if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
    throw new Error("Le date non sono valide")
  }

  const start = parseUtcDate(checkIn)
  const end = parseUtcDate(checkOut)
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  if (nights < 1) throw new Error("La data di check-out deve essere successiva al check-in")
  if (nights > 366) throw new Error("L’intervallo selezionato è troppo lungo")

  const db = getAdminDb()
  const finalRoomId = String(roomId || SUITE_ROOM_ID)
  const roomSnapshot = await db.doc(`rooms/${finalRoomId}`).get()
  const roomData = roomSnapshot.data() || {}
  const storedBase = Number(roomData.price)
  const basePrice = Number.isFinite(storedBase) && storedBase > 0 ? storedBase : SUITE_DEFAULT_PRICE
  const embeddedOverrides =
    roomData.priceOverrides && typeof roomData.priceOverrides === "object"
      ? (roomData.priceOverrides as Record<string, StoredOverride>)
      : {}

  const [seasons, specialPeriods, legacySnapshot] = await Promise.all([
    readCollection("pricing_seasons"),
    readCollection("pricing_special_periods"),
    db.collection("pricing_overrides").where("roomId", "==", finalRoomId).get().catch(() => null),
  ])

  const legacyOverrides = legacySnapshot
    ? legacySnapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as any)
    : []

  const priceBreakdown: PriceBreakdownItem[] = []
  let totalPrice = 0

  for (let index = 0; index < nights; index += 1) {
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + index)
    const dateString = date.toISOString().slice(0, 10)
    const embedded = embeddedOverrides[dateToStorageKey(dateString)] || embeddedOverrides[dateString]
    const embeddedPrice = Number(embedded?.price)

    if (Number.isFinite(embeddedPrice) && embeddedPrice > 0) {
      totalPrice += embeddedPrice
      priceBreakdown.push({
        date: dateString,
        price: embeddedPrice,
        source: "manual",
        label: embedded?.reason || "Prezzo manuale",
      })
      continue
    }

    const legacy = legacyOverrides.find((item) => item.date === dateString)
    const legacyPrice = Number(legacy?.price)
    if (legacy && Number.isFinite(legacyPrice) && legacyPrice > 0) {
      totalPrice += legacyPrice
      priceBreakdown.push({
        date: dateString,
        price: legacyPrice,
        source: "manual",
        label: legacy.reason || "Prezzo manuale",
      })
      continue
    }

    const special = specialPeriods.find(
      (item) => typeof item.startDate === "string" && typeof item.endDate === "string" && dateString >= item.startDate && dateString <= item.endDate,
    )
    if (special) {
      const price = Math.round(basePrice * Number(special.priceMultiplier || 1) * 100) / 100
      totalPrice += price
      priceBreakdown.push({ date: dateString, price, source: "special", label: special.name || "Periodo speciale" })
      continue
    }

    const season = seasons.find(
      (item) =>
        typeof item.startDate === "string" &&
        typeof item.endDate === "string" &&
        isDateInRecurringSeason(date, item.startDate, item.endDate),
    )
    if (season) {
      const price = Math.round(basePrice * Number(season.priceMultiplier || 1) * 100) / 100
      totalPrice += price
      priceBreakdown.push({ date: dateString, price, source: "season", label: season.name || "Stagione" })
      continue
    }

    totalPrice += basePrice
    priceBreakdown.push({ date: dateString, price: basePrice, source: "base", label: "Prezzo base" })
  }

  totalPrice = Math.round(totalPrice * 100) / 100

  return {
    roomId: finalRoomId,
    basePrice,
    nights,
    totalPrice,
    pricePerNight: Math.round((totalPrice / nights) * 100) / 100,
    priceBreakdown,
  }
}
