import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("bookingId")
    const userEmail = searchParams.get("userEmail")

    const db = getAdminDb()

    const convertTimestamp = (timestamp: any): string => {
      if (!timestamp) return new Date().toISOString()

      // If it's already a string, return it
      if (typeof timestamp === "string") return timestamp

      // If it has toDate method (Firestore Timestamp)
      if (timestamp.toDate && typeof timestamp.toDate === "function") {
        return timestamp.toDate().toISOString()
      }

      // If it has _seconds property (serialized Timestamp)
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toISOString()
      }

      return new Date().toISOString()
    }

    try {
      let query: any = db.collection("extra_services_requests")

      if (bookingId) {
        query = query.where("bookingId", "==", bookingId)
      } else if (userEmail) {
        query = query.where("userEmail", "==", userEmail)
      }

      query = query.orderBy("createdAt", "desc")

      const snapshot = await query.limit(50).get()
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
        }
      })

      return NextResponse.json({ requests })
    } catch (indexError: any) {
      if (indexError.code === 9) {
        console.log("[v0] Firestore index missing, using fallback without ordering")

        let query: any = db.collection("extra_services_requests")

        if (bookingId) {
          query = query.where("bookingId", "==", bookingId)
        } else if (userEmail) {
          query = query.where("userEmail", "==", userEmail)
        }

        const snapshot = await query.limit(50).get()
        const requests = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              createdAt: convertTimestamp(data.createdAt),
            }
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt)
            const dateB = new Date(b.createdAt)
            return dateB.getTime() - dateA.getTime()
          })

        return NextResponse.json({ requests })
      }
      throw indexError
    }
  } catch (error) {
    console.error("Error fetching service requests:", error)
    return NextResponse.json({ error: "Errore durante il caricamento" }, { status: 500 })
  }
}
