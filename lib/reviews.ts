// lib/reviews.ts
import { collection, getDocs, limit, orderBy, query, where, startAfter, type DocumentData } from "firebase/firestore"
import { db } from "./firebase"

export type Review = {
  id: string
  name: string
  location: string
  rating: number // 1..5
  comment: string
  date: string // es. "Dicembre 2024"
  verified?: boolean
  source?: "booking" | "airbnb" | "manual" | "default" | "other"
  createdAt?: number // timestamp per ordinamenti
  featuredScore?: number // campo opzionale per "le più belle"
  beds24Id?: string // Legacy: tracking synced reviews from Beds24
  smoobuId?: string // Tracking synced reviews from Smoobu
  bookingId?: string // Link reviews to bookings
  syncedAt?: string // Sync timestamp
}

const REVIEWS_COL = "reviews"

/**
 * Le 4 migliori (featured), altrimenti ordina per rating DESC e data recente.
 * Prevede campi opzionali featuredScore o createdAt, ma funziona anche senza.
 */
export async function getTop4Reviews(): Promise<Review[]> {
  const col = collection(db, REVIEWS_COL)
  // 1) prova per featuredScore
  const q = query(col, where("rating", ">=", 4), orderBy("rating", "desc"), limit(4))

  const snap = await getDocs(q)
  let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Review) }))

  if (items.length < 4) {
    // fallback: ricarica senza filtro, sempre desc per rating
    const q2 = query(col, orderBy("rating", "desc"), limit(4))
    const s2 = await getDocs(q2)
    items = s2.docs.map((d) => ({ id: d.id, ...(d.data() as Review) }))
  }
  return items.slice(0, 4)
}

export async function getAllReviewsPage(opts?: {
  pageSize?: number
  startAfterDoc?: DocumentData | null
  minRating?: number
}) {
  const pageSize = opts?.pageSize ?? 12
  const col = collection(db, REVIEWS_COL)

  let qbase = query(col, orderBy("createdAt", "desc"))
  if (opts?.minRating) {
    qbase = query(col, where("rating", ">=", opts.minRating), orderBy("createdAt", "desc"))
  }

  let qf = query(qbase, limit(pageSize))
  if (opts?.startAfterDoc) {
    qf = query(qbase, startAfter(opts.startAfterDoc), limit(pageSize))
  }

  const snap = await getDocs(qf)
  const docs = snap.docs
  const items = docs.map((d) => ({ id: d.id, ...(d.data() as Review) }))
  const last = docs.length ? docs[docs.length - 1] : null

  return { items, lastDoc: last }
}
