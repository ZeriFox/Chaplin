import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from "firebase/firestore"

// (Re)creates the single "La Suite" room document in Firestore.
// The site's price calculation reads `rooms/{id}`; after a database rebuild
// that document can be missing, which breaks prices everywhere. This endpoint
// restores it. It never overwrites an already-configured base price.

const ROOM_ID = "2"
const DEFAULT_PRICE = 150

const SUITE = {
  name: "La Suite",
  description: "Elegante suite con vasca idromassaggio, area spa privata e arredi di lusso.",
  capacity: 2,
  beds: 1,
  bathrooms: 1,
  size: 57,
  status: "available" as const,
  amenities: [
    "Vasca idromassaggio",
    "Area spa privata",
    "Aria condizionata",
    "TV satellitare",
    "WiFi gratuito",
    "Minibar",
    "Asciugacapelli",
    "Cucina attrezzata",
  ],
  images: ["/images/chaplin-camera-matrimoniale.jpeg", "/images/spa1.jpg", "/images/room-1.jpg"],
}

export async function POST() {
  try {
    const ref = doc(db, "rooms", ROOM_ID)
    const snap = await getDoc(ref)

    const existing = snap.exists() ? snap.data() : null
    const price =
      existing && typeof existing.price === "number" && existing.price > 0 ? existing.price : DEFAULT_PRICE

    await setDoc(
      ref,
      {
        ...SUITE,
        price,
        updatedAt: serverTimestamp(),
        ...(snap.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    )

    const all = await getDocs(collection(db, "rooms"))
    const rooms = all.docs.map((d) => ({ id: d.id, name: d.data().name, price: d.data().price }))

    return NextResponse.json({
      success: true,
      created: !snap.exists(),
      roomId: ROOM_ID,
      price,
      rooms,
    })
  } catch (error) {
    console.error("[ensure-suite] Error:", error)
    return NextResponse.json({ error: "Failed to ensure Suite room" }, { status: 500 })
  }
}
