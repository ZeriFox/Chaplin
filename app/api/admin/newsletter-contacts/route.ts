import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const runtime = "nodejs"

function serializeTimestamp(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi(request)

    const snapshot = await getAdminDb().collection("newsletter_contacts").orderBy("createdAt", "desc").limit(500).get()
    const contacts = snapshot.docs.map((document) => {
      const data = document.data()
      return {
        id: document.id,
        phone: data.phone || "",
        status: data.status || "active",
        source: data.source || "website-whatsapp-promotions",
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      }
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("[Newsletter Admin] Read error:", error)
    return adminApiErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminApi(request)

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
    return adminApiErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminApi(request)

    const contactId = new URL(request.url).searchParams.get("id") || ""
    if (!contactId) {
      return NextResponse.json({ error: "Contatto mancante" }, { status: 400 })
    }

    await getAdminDb().collection("newsletter_contacts").doc(contactId).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Newsletter Admin] Delete error:", error)
    return adminApiErrorResponse(error)
  }
}
