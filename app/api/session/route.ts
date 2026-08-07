import { NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import {
  createAdminSession,
  createOtpChallenge,
  getAdminSecurityProfile,
  revokeAdminSessionCookie,
  TwoFactorError,
  verifyAdminSessionCookie,
} from "@/lib/admin-two-factor"
import {
  clearAuthenticatedSessionCookies,
  readRequestCookie,
  setAuthenticatedSessionCookies,
  type SessionRole,
} from "@/lib/admin-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function authorizedAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "chaplinviterbo2@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

async function resolveUser(token: string) {
  const decoded = await getAdminAuth().verifyIdToken(token, true)
  const email = String(decoded.email || "").trim().toLowerCase()
  const userDocument = await getAdminDb().doc(`users/${decoded.uid}`).get()
  const role: SessionRole =
    userDocument.data()?.role === "admin" || authorizedAdminEmails().has(email) ? "admin" : "user"

  return { uid: decoded.uid, email, role }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string }
    const token = body.token?.trim()
    if (!token) return NextResponse.json({ ok: false, error: "Token mancante" }, { status: 400 })

    const firebaseUser = await resolveUser(token)

    if (firebaseUser.role !== "admin") {
      const response = NextResponse.json({ ok: true, role: "user", requiresOtp: false })
      response.headers.set("Cache-Control", "no-store")
      setAuthenticatedSessionCookies({ request, response, idToken: token, role: "user" })
      return response
    }

    const security = await getAdminSecurityProfile(firebaseUser.uid)

    if (security.twoFactorEnabled) {
      if (!security.method || !security.destination) {
        return NextResponse.json(
          { ok: false, error: "Configurazione 2FA incompleta. Contatta l’assistenza" },
          { status: 500 },
        )
      }

      const existingSessionCookie = readRequestCookie(request, "admin_session")
      if (await verifyAdminSessionCookie(existingSessionCookie, firebaseUser.uid)) {
        const response = NextResponse.json({ ok: true, role: "admin", requiresOtp: false })
        response.headers.set("Cache-Control", "no-store")
        setAuthenticatedSessionCookies({
          request,
          response,
          idToken: token,
          role: "admin",
          adminSessionToken: existingSessionCookie,
        })
        return response
      }

      const challenge = await createOtpChallenge({
        uid: firebaseUser.uid,
        purpose: "login",
        method: security.method,
        destination: security.destination,
      })

      const response = NextResponse.json({
        ok: true,
        role: "admin",
        requiresOtp: true,
        ...challenge,
      })
      response.headers.set("Cache-Control", "no-store")
      clearAuthenticatedSessionCookies(request, response)
      return response
    }

    const adminSession = await createAdminSession(firebaseUser.uid)
    const response = NextResponse.json({ ok: true, role: "admin", requiresOtp: false })
    response.headers.set("Cache-Control", "no-store")
    setAuthenticatedSessionCookies({
      request,
      response,
      idToken: token,
      role: "admin",
      adminSessionToken: adminSession.token,
      adminSessionMaxAge: adminSession.maxAgeSeconds,
    })
    return response
  } catch (error) {
    console.error("[session] Invalid Firebase session", error)
    const status = error instanceof TwoFactorError ? error.status : 401
    const message = error instanceof Error ? error.message : "Sessione non valida"
    const response = NextResponse.json({ ok: false, error: message }, { status })
    response.headers.set("Cache-Control", "no-store")
    clearAuthenticatedSessionCookies(request, response)
    return response
  }
}

export async function DELETE(request: Request) {
  const existingSessionCookie = readRequestCookie(request, "admin_session")
  await revokeAdminSessionCookie(existingSessionCookie)

  const response = NextResponse.json({ ok: true })
  response.headers.set("Cache-Control", "no-store")
  clearAuthenticatedSessionCookies(request, response)
  return response
}
