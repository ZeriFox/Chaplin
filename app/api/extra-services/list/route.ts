import { type NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { AdminApiError, adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get("bookingId")
    const userEmail = searchParams.get("userEmail")

    const db = getAdminDb()
    const authorization = request.headers.get("authorization") || ""
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) throw new AdminApiError("Autenticazione richiesta", 401)

    let decoded
    try {
      decoded = await getAdminAuth().verifyIdToken(token, true)
    } catch {
      throw new AdminApiError("Sessione non valida o scaduta", 401)
    }

    if (!bookingId && !userEmail) {
      await requireAdminApi(request)
    } else if (userEmail && String(decoded.email || "").toLowerCase() !== userEmail.trim().toLowerCase()) {
      await requireAdminApi(request)
    } else if (bookingId) {
      const booking = await db.collection("bookings").doc(bookingId).get()
      const bookingData = booking.data()
      const ownsBooking =
        booking.exists &&
        (bookingData?.userId === decoded.uid ||
          String(bookingData?.email || "").toLowerCase() === String(decoded.email || "").toLowerCase())
      if (!ownsBooking) await requireAdminApi(request)
    }

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
      const requests = snapshot.docs.map((doc: any) => {
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
          .map((doc: any) => {
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
    return adminApiErrorResponse(error)
  }
}
