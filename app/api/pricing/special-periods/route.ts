import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore"

export async function GET() {
  try {
    const periodsRef = collection(db, "pricing_special_periods")
    const snapshot = await getDocs(periodsRef)

    const periods = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(periods)
  } catch (error) {
    console.error("Error fetching special periods:", error)
    return NextResponse.json({ error: "Failed to fetch special periods" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const periodsRef = collection(db, "pricing_special_periods")
    const docRef = await addDoc(periodsRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ id: docRef.id, ...data })
  } catch (error) {
    console.error("Error creating special period:", error)
    return NextResponse.json({ error: "Failed to create special period" }, { status: 500 })
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

    const periodRef = doc(db, "pricing_special_periods", id)
    await updateDoc(periodRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({ id, ...data })
  } catch (error) {
    console.error("Error updating special period:", error)
    return NextResponse.json({ error: "Failed to update special period" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 })
    }

    const periodRef = doc(db, "pricing_special_periods", id)
    await deleteDoc(periodRef)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting special period:", error)
    return NextResponse.json({ error: "Failed to delete special period" }, { status: 500 })
  }
}
