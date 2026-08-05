import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const { roomId, basePrice } = await request.json()
    const normalizedPrice = Number(basePrice)

    if (!roomId || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }

    await getAdminDb().doc(`rooms/${roomId}`).update({
      price: Math.round(normalizedPrice * 100) / 100,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return adminApiErrorResponse(error)
  }
}
