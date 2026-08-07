import { NextResponse } from "next/server"

import { getAdminAuth } from "@/lib/firebase-admin"
import {
  revokeAllAdminSessions,
  TwoFactorError,
  verifyOtpChallenge,
} from "@/lib/admin-two-factor"
import { clearAuthenticatedSessionCookies } from "@/lib/admin-session"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"

function validatePassword(password: string) {
  if (password.length < 8) return "La password deve contenere almeno 8 caratteri"
  if (!/[A-Z]/.test(password)) return "Inserisci almeno una lettera maiuscola"
  if (!/[a-z]/.test(password)) return "Inserisci almeno una lettera minuscola"
  if (!/\d/.test(password)) return "Inserisci almeno un numero"
  if (!/[^A-Za-z0-9]/.test(password)) return "Inserisci almeno un simbolo"
  return null
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const body = (await request.json()) as { challengeId?: string; otp?: string; newPassword?: string }
    const challengeId = body.challengeId?.trim()
    const otp = body.otp?.trim()
    const newPassword = String(body.newPassword || "")
    const passwordError = validatePassword(newPassword)

    if (!challengeId || !otp) {
      return NextResponse.json({ error: "Codice OTP e richiesta sono obbligatori" }, { status: 400 })
    }
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    await verifyOtpChallenge({
      uid: admin.uid,
      purpose: "password_change",
      challengeId,
      code: otp,
    })

    await getAdminAuth().updateUser(admin.uid, { password: newPassword })
    await getAdminAuth().revokeRefreshTokens(admin.uid)
    await revokeAllAdminSessions(admin.uid)

    const response = NextResponse.json({ ok: true, logout: true })
    clearAuthenticatedSessionCookies(request, response)
    return response
  } catch (error) {
    if (error instanceof TwoFactorError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}
