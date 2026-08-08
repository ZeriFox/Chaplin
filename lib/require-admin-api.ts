import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { getAdminSecurityProfile, verifyAdminSessionCookie } from "@/lib/admin-two-factor"
import { readRequestCookie } from "@/lib/admin-session"

export class AdminApiError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "AdminApiError"
    this.status = status
  }
}

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "chaplinviterbo2@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Verifica il Firebase ID token, il ruolo amministratore e, quando la 2FA è
 * attiva, anche la sessione OTP HttpOnly rilasciata dopo il secondo fattore.
 */
export async function requireAdminApi(
  request: Request,
  options: { allowPasswordChangeRequired?: boolean } = {},
) {
  const authorization = request.headers.get("authorization") || ""
  const match = authorization.match(/^Bearer\s+(.+)$/i)

  if (!match) throw new AdminApiError("Autenticazione richiesta", 401)

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(match[1], true)
  } catch {
    throw new AdminApiError("Sessione Firebase non valida o scaduta", 401)
  }

  const userSnapshot = await getAdminDb().doc(`users/${decoded.uid}`).get()
  const email = String(decoded.email || "").trim().toLowerCase()
  const userData = userSnapshot.data()
  const isAdmin = userData?.role === "admin" || configuredAdminEmails().has(email)

  if (!isAdmin) throw new AdminApiError("Permessi amministratore richiesti", 403)
  const mustChangePassword = userData?.mustChangePassword !== false
  if (mustChangePassword && !options.allowPasswordChangeRequired) {
    throw new AdminApiError("Cambio password obbligatorio prima di usare il pannello", 428)
  }

  const security = await getAdminSecurityProfile(decoded.uid)
  if (security.twoFactorEnabled) {
    const sessionCookie = readRequestCookie(request, "admin_session")
    const validSession = await verifyAdminSessionCookie(sessionCookie, decoded.uid)
    if (!validSession) {
      throw new AdminApiError("Conferma OTP richiesta. Accedi nuovamente al pannello", 401)
    }
  }

  return { uid: decoded.uid, email, token: match[1], security, mustChangePassword }
}

export function adminApiErrorResponse(error: unknown) {
  if (error instanceof AdminApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }

  console.error("[admin-api] Unexpected error:", error)
  return Response.json({ error: error instanceof Error ? error.message : "Errore interno del server" }, { status: 500 })
}
