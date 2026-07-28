import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"

export async function GET() {
  try {
    const seasonsRef = collection(db, "pricing_seasons")
    const snapshot = await getDocs(seasonsRef)

    const seasons = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(seasons)
  } catch (error) {
    console.error("Error fetching seasons:", error)
    return NextResponse.json({ error: "Failed to fetch seasons" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const seasonsRef = collection(db, "pricing_seasons")
    const docRef = await addDoc(seasonsRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ id: docRef.id, ...data })
  } catch (error) {
    console.error("Error creating season:", error)
    return NextResponse.json({ error: "Failed to create season" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 })
    }

    const data = await request.json()

    const seasonRef = doc(db, "pricing_seasons", id)
    await updateDoc(seasonRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ id, ...data })
  } catch (error) {
    console.error("Error updating season:", error)
    return NextResponse.json({ error: "Failed to update season" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 })
    }

    const seasonRef = doc(db, "pricing_seasons", id)
    await deleteDoc(seasonRef)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting season:", error)
    return NextResponse.json({ error: "Failed to delete season" }, { status: 500 })
  }
}
