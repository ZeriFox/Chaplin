import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export class AdminApiError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "AdminApiError"
    this.status = status
  }
}

/**
 * Verifies the Firebase ID token sent by the admin panel and checks the
 * corresponding Firestore user document. Never trust the client-side role
 * cookie for API authorization.
 */
export async function requireAdminApi(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  const match = authorization.match(/^Bearer\s+(.+)$/i)

  if (!match) {
    throw new AdminApiError("Autenticazione richiesta", 401)
  }

  const decoded = await getAdminAuth().verifyIdToken(match[1], true)
  const userSnapshot = await getAdminDb().doc(`users/${decoded.uid}`).get()

  if (!userSnapshot.exists || userSnapshot.data()?.role !== "admin") {
    throw new AdminApiError("Permessi amministratore richiesti", 403)
  }

  return { uid: decoded.uid, email: decoded.email || "" }
}

export function adminApiErrorResponse(error: unknown) {
  if (error instanceof AdminApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }

  console.error("[admin-api] Unexpected error:", error)
  return Response.json({ error: "Errore interno del server" }, { status: 500 })
}
