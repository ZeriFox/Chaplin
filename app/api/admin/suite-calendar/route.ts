import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { requireAdmin } from "@/lib/require-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROOM_ID = "2"
const MAX_RANGE_DAYS = 366
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type CalendarUpdate = {
  from?: string
  to?: string
  price?: number | null
  available?: boolean
}

function dateRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const dates: string[] = []

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return dates

  for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    dates.push(current.toISOString().slice(0, 10))
    if (dates.length > MAX_RANGE_DAYS) return []
  }

  return dates
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const db = getAdminDb()
    const [roomSnapshot, calendarSnapshot, overridesSnapshot] = await Promise.all([
      db.collection("rooms").doc(ROOM_ID).get(),
      db.collection("suite_calendar").where("roomId", "==", ROOM_ID).get(),
      db.collection("pricing_overrides").where("roomId", "==", ROOM_ID).get(),
    ])

    const days: Record<string, { price?: number; available?: boolean }> = {}

    calendarSnapshot.forEach((document) => {
      const data = document.data()
      if (typeof data.date === "string") {
        days[data.date] = {
          ...(typeof data.available === "boolean" ? { available: data.available } : {}),
        }
      }
    })

    overridesSnapshot.forEach((document) => {
      const data = document.data()
      if (typeof data.date === "string" && Number.isFinite(data.price)) {
        days[data.date] = { ...days[data.date], price: Number(data.price) }
      }
    })

    return NextResponse.json({
      roomId: ROOM_ID,
      roomName: "La Suite",
      basePrice: Number(roomSnapshot.data()?.price) || 150,
      days,
    })
  } catch (error) {
    console.error("[Suite Calendar] Read error:", error)
    return NextResponse.json({ error: "Impossibile caricare il calendario" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const body = (await request.json()) as CalendarUpdate
    const from = String(body.from ?? "")
    const to = String(body.to ?? body.from ?? "")

    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
      return NextResponse.json({ error: "Inserisci un intervallo di date valido" }, { status: 400 })
    }

    const dates = dateRange(from, to)
    if (!dates.length) {
      return NextResponse.json({ error: `Puoi modificare al massimo ${MAX_RANGE_DAYS} giorni` }, { status: 400 })
    }

    const hasPrice = Object.prototype.hasOwnProperty.call(body, "price")
    const hasAvailability = typeof body.available === "boolean"
    const price = body.price === null ? null : Number(body.price)

    if (!hasPrice && !hasAvailability) {
      return NextResponse.json({ error: "Nessuna modifica da salvare" }, { status: 400 })
    }

    if (hasPrice && price !== null && (!Number.isFinite(price) || price < 1 || price > 10_000)) {
      return NextResponse.json({ error: "Il prezzo deve essere compreso tra 1 e 10.000 euro" }, { status: 400 })
    }

    const db = getAdminDb()

    for (let offset = 0; offset < dates.length; offset += 200) {
      const batch = db.batch()
      const chunk = dates.slice(offset, offset + 200)

      for (const date of chunk) {
        if (hasAvailability) {
          const calendarRef = db.collection("suite_calendar").doc(`${ROOM_ID}_${date}`)
          batch.set(
            calendarRef,
            {
              roomId: ROOM_ID,
              date,
              available: body.available,
              updatedBy: admin.uid,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          )
        }

        if (hasPrice) {
          const overrideRef = db.collection("pricing_overrides").doc(`${ROOM_ID}_${date}`)
          if (price === null) {
            batch.delete(overrideRef)
          } else {
            batch.set(
              overrideRef,
              {
                roomId: ROOM_ID,
                date,
                price: Math.round(price * 100) / 100,
                reason: "Impostato dal calendario admin",
                updatedBy: admin.uid,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            )
          }
        }
      }

      await batch.commit()
    }
    return NextResponse.json({ success: true, updatedDates: dates.length })
  } catch (error) {
    console.error("[Suite Calendar] Update error:", error)
    return NextResponse.json({ error: "Impossibile salvare le modifiche" }, { status: 500 })
  }
}
