import { createDecipheriv, createHash, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TOKEN_HASH = "90e683bf611fe48bccc8b69d1be1dd2cf997f43866d3fc7c33f385809b4d90fc"
const ENCRYPTION_KEY = Buffer.from("9c1c8d05efae816943907ae28ea707ea9142b5a07fcd7f5d56221d51efe8d9b5", "hex")
const EXPIRES_AT = 1785962094973

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

export async function GET(request: NextRequest) {
  if (Date.now() > EXPIRES_AT) return json({ ok: false, error: "expired" }, 410)

  const token = request.nextUrl.searchParams.get("token") || ""
  const supplied = createHash("sha256").update(token).digest()
  const expected = Buffer.from(TOKEN_HASH, "hex")
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return json({ ok: false, error: "invalid_token" }, 401)
  }

  try {
    const iv = decodeBase64Url(request.nextUrl.searchParams.get("iv") || "")
    const encrypted = decodeBase64Url(request.nextUrl.searchParams.get("data") || "")
    const tag = decodeBase64Url(request.nextUrl.searchParams.get("tag") || "")

    const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
    const payload = JSON.parse(decrypted) as { email?: string; password?: string }

    if (!payload.email || !payload.password) return json({ ok: false, error: "invalid_payload" }, 400)

    const auth = getAdminAuth()
    const db = getAdminDb()
    const user = await auth.getUserByEmail(payload.email)
    const userDoc = await db.collection("users").doc(user.uid).get()
    const role = userDoc.exists ? String(userDoc.data()?.role || "") : ""

    if (role !== "admin") return json({ ok: false, error: "not_admin" }, 403)

    await auth.updateUser(user.uid, { password: payload.password })
    await auth.revokeRefreshTokens(user.uid)

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    let signInVerified = false
    let signInError: string | null = null

    if (apiKey) {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: payload.email, password: payload.password, returnSecureToken: true }),
          cache: "no-store",
        },
      )
      signInVerified = response.ok
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        signInError = body?.error?.message || `sign_in_${response.status}`
      }
    } else {
      signInError = "missing_api_key"
    }

    return json({ ok: signInVerified, passwordUpdated: true, role, signInVerified, signInError })
  } catch (error: any) {
    return json({ ok: false, error: error?.code || error?.message || "reset_failed" }, 500)
  }
}
