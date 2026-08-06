import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"

export const SUITE_ROOM_ID = "2"
export const SUITE_DEFAULT_PRICE = 150

const SUITE_DATA = {
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

export async function ensureSuiteRoom() {
  const db = getAdminDb()
  const ref = db.collection("rooms").doc(SUITE_ROOM_ID)
  const snapshot = await ref.get()
  const existing = snapshot.exists ? snapshot.data() : undefined
  const price =
    typeof existing?.price === "number" && existing.price > 0
      ? existing.price
      : SUITE_DEFAULT_PRICE

  await ref.set(
    {
      ...SUITE_DATA,
      price,
      updatedAt: FieldValue.serverTimestamp(),
      ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  )

  return {
    roomId: SUITE_ROOM_ID,
    roomName: SUITE_DATA.name,
    basePrice: price,
    created: !snapshot.exists,
  }
}
