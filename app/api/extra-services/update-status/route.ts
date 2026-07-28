import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, status } = body

    if (!requestId || !status) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 })
    }

    const db = getAdminDb()
    const requestRef = db.collection("extra_services_requests").doc(requestId)
    const requestSnap = await requestRef.get()

    if (!requestSnap.exists) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    await requestRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating service request status:", error)
    return NextResponse.json({ error: "Errore durante l'aggiornamento" }, { status: 500 })
  }
}


