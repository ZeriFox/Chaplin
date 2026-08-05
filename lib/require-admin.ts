import type { NextRequest } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export async function requireAdmin(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") ?? ""
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""

    if (!token) return null

    const decoded = await getAdminAuth().verifyIdToken(token)
    const userDocument = await getAdminDb().collection("users").doc(decoded.uid).get()

    return userDocument.data()?.role === "admin" ? decoded : null
  } catch {
    return null
  }
}
