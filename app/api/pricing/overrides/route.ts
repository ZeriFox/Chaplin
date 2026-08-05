import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { requireAdmin } from "@/lib/require-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const snapshot = await getAdminDb().collection("pricing_overrides").get()
    return NextResponse.json(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })))
  } catch (error) {
    console.error("[Pricing Overrides] Read error:", error)
    return NextResponse.json({ error: "Impossibile caricare i prezzi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const body = await request.json()
    const roomId = String(body.roomId ?? "")
    const date = String(body.date ?? "")
    const price = Number(body.price)

    if (roomId !== "2" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(price) || price < 1) {
      return NextResponse.json({ error: "Dati prezzo non validi" }, { status: 400 })
    }

    const documentId = `${roomId}_${date}`
    await getAdminDb().collection("pricing_overrides").doc(documentId).set(
      {
        roomId,
        date,
        price: Math.round(price * 100) / 100,
        reason: String(body.reason ?? "Prezzo personalizzato").slice(0, 250),
        updatedBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return NextResponse.json({ id: documentId, roomId, date, price })
  } catch (error) {
    console.error("[Pricing Overrides] Create error:", error)
    return NextResponse.json({ error: "Impossibile salvare il prezzo" }, { status: 500 })
  }
}
