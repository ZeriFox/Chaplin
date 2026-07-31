import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization") || ""
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""

  if (!token) return null

  const decoded = await getAdminAuth().verifyIdToken(token)
  const userDocument = await getAdminDb().collection("users").doc(decoded.uid).get()

  return userDocument.data()?.role === "admin" ? decoded : null
}

function serializeTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const snapshot = await getAdminDb().collection("newsletter_contacts").orderBy("createdAt", "desc").limit(500).get()
    const contacts = snapshot.docs.map((document) => {
      const data = document.data()
      return {
        id: document.id,
        email: data.email || "",
        phone: data.phone || "",
        status: data.status || "active",
        source: data.source || "website-newsletter",
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      }
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("[Newsletter Admin] Read error:", error)
    return NextResponse.json({ error: "Impossibile caricare i contatti" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json()
    const contactId = typeof body.id === "string" ? body.id : ""
    const status = body.status === "unsubscribed" ? "unsubscribed" : body.status === "active" ? "active" : ""

    if (!contactId || !status) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }

    await getAdminDb().collection("newsletter_contacts").doc(contactId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      ...(status === "unsubscribed" ? { unsubscribedAt: FieldValue.serverTimestamp() } : {}),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Newsletter Admin] Update error:", error)
    return NextResponse.json({ error: "Impossibile aggiornare il contatto" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const contactId = new URL(request.url).searchParams.get("id") || ""
    if (!contactId) {
      return NextResponse.json({ error: "Contatto mancante" }, { status: 400 })
    }

    await getAdminDb().collection("newsletter_contacts").doc(contactId).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Newsletter Admin] Delete error:", error)
    return NextResponse.json({ error: "Impossibile eliminare il contatto" }, { status: 500 })
  }
}
