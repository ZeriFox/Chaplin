import { createHash } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function normalizePhone(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, "")
  return `${trimmed.startsWith("+") ? "+" : ""}${digits}`
}

export async function POST(request: NextRequest) {
  try {
    const firebaseConfigured =
      process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY

    if (!firebaseConfigured) {
      return NextResponse.json({ error: "Il servizio newsletter non è ancora configurato." }, { status: 503 })
    }

    const body = await request.json()
    const email = cleanText(body.email, 254).toLowerCase()
    const rawPhone = cleanText(body.phone, 40)
    const website = cleanText(body.website, 200)
    const marketingConsent = body.marketingConsent === true

    // Honeypot anti-spam: i bot ricevono una risposta positiva senza scrivere nel database.
    if (website) {
      return NextResponse.json({ success: true })
    }

    if (!email || !rawPhone || !marketingConsent) {
      return NextResponse.json(
        { error: "Inserisci email, numero di telefono e consenso alla newsletter." },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 })
    }

    const phone = normalizePhone(rawPhone)
    const phoneDigits = phone.replace(/\D/g, "")

    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return NextResponse.json({ error: "Inserisci un numero di telefono valido." }, { status: 400 })
    }

    const db = getAdminDb()
    const contactId = createHash("sha256").update(email).digest("hex")
    const contactRef = db.collection("newsletter_contacts").doc(contactId)
    const existingContact = await contactRef.get()
    const timestamp = FieldValue.serverTimestamp()

    await contactRef.set(
      {
        email,
        phone,
        status: "active",
        source: "website-newsletter",
        marketingConsent: true,
        consentAt: timestamp,
        updatedAt: timestamp,
        ...(existingContact.exists ? {} : { createdAt: timestamp }),
      },
      { merge: true },
    )

    return NextResponse.json({ success: true, alreadySubscribed: existingContact.exists })
  } catch (error) {
    console.error("[Newsletter] Subscription error:", error)
    return NextResponse.json({ error: "Non è stato possibile completare l’iscrizione." }, { status: 500 })
  }
}
