import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"

export async function GET() {
  try {
    const overridesRef = collection(db, "pricing_overrides")
    const snapshot = await getDocs(overridesRef)

    const overrides = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(overrides)
  } catch (error) {
    console.error("Error fetching price overrides:", error)
    return NextResponse.json({ error: "Failed to fetch price overrides" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const overridesRef = collection(db, "pricing_overrides")
    const docRef = await addDoc(overridesRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ id: docRef.id, ...data })
  } catch (error) {
    console.error("Error creating price override:", error)
    return NextResponse.json({ error: "Failed to create price override" }, { status: 500 })
  }
}
