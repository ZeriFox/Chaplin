import { NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import {
  createAdminSession,
  TwoFactorError,
  verifyOtpChallenge,
} from "@/lib/admin-two-factor"
import {
  clearAuthenticatedSessionCookies,
  setAuthenticatedSessionCookies,
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; challengeId?: string; otp?: string }
    const token = body.token?.trim()
    const challengeId = body.challengeId?.trim()
    const otp = body.otp?.trim()

    if (!token || !challengeId || !otp) {
      return NextResponse.json({ ok: false, error: "Token, richiesta OTP e codice sono obbligatori" }, { status: 400 })
    }

    const decoded = await getAdminAuth().verifyIdToken(token, true)
    const email = String(decoded.email || "").trim().toLowerCase()
    const userDocument = await getAdminDb().doc(`users/${decoded.uid}`).get()
    const isAdmin = userDocument.data()?.role === "admin" || authorizedAdminEmails().has(email)
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Permessi amministratore richiesti" }, { status: 403 })

    await verifyOtpChallenge({ uid: decoded.uid, purpose: "login", challengeId, code: otp })
    const adminSession = await createAdminSession(decoded.uid)

    const response = NextResponse.json({ ok: true, role: "admin" })
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
    const status = error instanceof TwoFactorError ? error.status : 401
    const message = error instanceof Error ? error.message : "Codice OTP non valido"
    const response = NextResponse.json({ ok: false, error: message }, { status })
    response.headers.set("Cache-Control", "no-store")
    clearAuthenticatedSessionCookies(request, response)
    return response
  }
}
