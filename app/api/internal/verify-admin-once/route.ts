import { createDecipheriv, createHash, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TOKEN_HASH = "732b778e210a8f907861a4dc612df96acf938e418c1129705f18e55b5484c947"
const ENCRYPTION_KEY = Buffer.from("69f15f4e07e887efe8a5404fd14712697467993575a30e6471a46b2e68c95507", "hex")
const EXPIRES_AT = 1785960028710

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function unauthorized(message: string, status = 401) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  )
}

export async function GET(request: NextRequest) {
  if (Date.now() > EXPIRES_AT) {
    return unauthorized("verification_expired", 410)
  }

  const token = request.nextUrl.searchParams.get("token") || ""
  const suppliedHash = createHash("sha256").update(token).digest()
  const expectedHash = Buffer.from(TOKEN_HASH, "hex")

  if (suppliedHash.length !== expectedHash.length || !timingSafeEqual(suppliedHash, expectedHash)) {
    return unauthorized("invalid_token")
  }

  try {
    const iv = decodeBase64Url(request.nextUrl.searchParams.get("iv") || "")
    const encrypted = decodeBase64Url(request.nextUrl.searchParams.get("data") || "")
    const tag = decodeBase64Url(request.nextUrl.searchParams.get("tag") || "")

    const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
    const credentials = JSON.parse(decrypted) as { email?: string; password?: string }

    if (!credentials.email || !credentials.password) {
      return unauthorized("invalid_payload", 400)
    }

    let authUserExists = false
    let disabled: boolean | null = null
    let emailVerified: boolean | null = null
    let role: string | null = null
    let uid: string | null = null
    let adminLookupError: string | null = null

    try {
      const userRecord = await getAdminAuth().getUserByEmail(credentials.email)
      authUserExists = true
      disabled = userRecord.disabled
      emailVerified = userRecord.emailVerified
      uid = userRecord.uid

      const userDocument = await getAdminDb().collection("users").doc(userRecord.uid).get()
      role = userDocument.exists ? String(userDocument.data()?.role || "") || null : null
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        adminLookupError = error?.code || error?.message || "admin_lookup_failed"
      }
    }

    let passwordSignInOk = false
    let signInError: string | null = null
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

    if (!apiKey) {
      signInError = "missing_firebase_api_key"
    } else {
      try {
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              returnSecureToken: true,
            }),
            cache: "no-store",
          },
        )

        if (response.ok) {
          passwordSignInOk = true
        } else {
          const body = await response.json().catch(() => null)
          signInError = body?.error?.message || `firebase_sign_in_${response.status}`
        }
      } catch (error: any) {
        signInError = error?.message || "firebase_sign_in_failed"
      }
    }

    const adminAccessOk =
      authUserExists && disabled === false && role === "admin" && passwordSignInOk && !adminLookupError

    return NextResponse.json(
      {
        ok: true,
        authUserExists,
        disabled,
        emailVerified,
        firestoreUserDocumentExists: authUserExists && role !== null,
        role,
        passwordSignInOk,
        adminAccessOk,
        adminLookupError,
        signInError,
        uidPresent: Boolean(uid),
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return unauthorized("verification_failed", 400)
  }
}
