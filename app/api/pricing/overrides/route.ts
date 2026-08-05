import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"
import { getAdminDb } from "@/lib/firebase-admin"

const COLLECTION = "pricing_overrides"

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection(COLLECTION).get()
    const overrides = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json(overrides)
  } catch (error) {
    console.error("Error fetching price overrides:", error)
    return NextResponse.json({ error: "Failed to fetch price overrides" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const body = await request.json()
    const roomId = String(body.roomId || "")
    const startDate = body.startDate
    const endDate = body.endDate
    const price = Number(body.price)
    const reason = String(body.reason || "Modifica manuale")

    if (!roomId || !isValidDate(startDate) || !isValidDate(endDate) || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "Intervallo date non valido" }, { status: 400 })
    }

    const start = new Date(`${startDate}T12:00:00Z`)
    const end = new Date(`${endDate}T12:00:00Z`)
    const db = getAdminDb()
    const batch = db.batch()
    let count = 0

    for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      const date = current.toISOString().slice(0, 10)
      const id = `${roomId}_${date}`
      batch.set(
        db.collection(COLLECTION).doc(id),
        {
          roomId,
          date,
          price: Math.round(price * 100) / 100,
          reason,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
        },
        { merge: true },
      )
      count += 1
    }

    await batch.commit()
    return NextResponse.json({ success: true, count })
  } catch (error) {
    return adminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminApi(request)
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId") || ""
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!roomId || !isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) {
      return NextResponse.json({ error: "Intervallo non valido" }, { status: 400 })
    }

    const db = getAdminDb()
    const batch = db.batch()
    const start = new Date(`${startDate}T12:00:00Z`)
    const end = new Date(`${endDate}T12:00:00Z`)
    let count = 0

    for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
      const date = current.toISOString().slice(0, 10)
      batch.delete(db.collection(COLLECTION).doc(`${roomId}_${date}`))
      count += 1
    }

    await batch.commit()
    return NextResponse.json({ success: true, count })
  } catch (error) {
    return adminApiErrorResponse(error)
  }
}
