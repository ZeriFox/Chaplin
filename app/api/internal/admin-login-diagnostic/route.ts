import { createDecipheriv, createHash, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const EXPIRES_AT = 1786023558
const TOKEN_HASH = "34d35399be6c0867c438a52467d06a3286674fdbe57aafa2236db3ae34db13b3"
const ADMIN_EMAIL = "chaplinviterbo2@gmail.com"
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBKK8q78f-DuOtzIqV7EDAnUVsVp05-IHs"
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chaplin-viterbo"

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : ""
  return Buffer.from(normalized + padding, "base64")
}

function validToken(value: string) {
  const actual = createHash("sha256").update(value).digest()
  const expected = Buffer.from(TOKEN_HASH, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function decryptPayload(keyValue: string, nonceValue: string, cipherValue: string) {
  const key = fromBase64Url(keyValue)
  const nonce = fromBase64Url(nonceValue)
  const encryptedWithTag = fromBase64Url(cipherValue)
  const tag = encryptedWithTag.subarray(encryptedWithTag.length - 16)
  const encrypted = encryptedWithTag.subarray(0, encryptedWithTag.length - 16)
  const decipher = createDecipheriv("aes-256-gcm", key, nonce)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  return JSON.parse(plaintext) as { email?: string; password?: string }
}

export async function GET(request: Request) {
  const responseHeaders = { "Cache-Control": "no-store" }

  try {
    if (Math.floor(Date.now() / 1000) > EXPIRES_AT) {
      return NextResponse.json({ ok: false, stage: "expired" }, { status: 410, headers: responseHeaders })
    }

    const url = new URL(request.url)
    const token = url.searchParams.get("t") || ""
    const key = url.searchParams.get("k") || ""
    const nonce = url.searchParams.get("n") || ""
    const cipher = url.searchParams.get("p") || ""

    if (!validToken(token)) {
      return NextResponse.json({ ok: false, stage: "unauthorized" }, { status: 403, headers: responseHeaders })
    }

    const payload = decryptPayload(key, nonce, cipher)
    const email = payload.email?.trim().toLowerCase() || ""
    const password = payload.password || ""

    if (email !== ADMIN_EMAIL || !password) {
      return NextResponse.json({ ok: false, stage: "payload_rejected" }, { status: 400, headers: responseHeaders })
    }

    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        cache: "no-store",
      },
    )

    const signInBody = await signInResponse.json().catch(() => null)
    if (!signInResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          stage: "firebase_sign_in",
          firebaseProjectId: FIREBASE_PROJECT_ID,
          status: signInResponse.status,
          code: signInBody?.error?.message || "unknown",
        },
        { status: 200, headers: responseHeaders },
      )
    }

    const uid = signInBody?.localId as string | undefined
    const authenticatedEmail = String(signInBody?.email || "").toLowerCase()
    const idToken = signInBody?.idToken as string | undefined

    if (!uid || !idToken) {
      return NextResponse.json(
        { ok: false, stage: "firebase_response_incomplete", firebaseProjectId: FIREBASE_PROJECT_ID },
        { status: 200, headers: responseHeaders },
      )
    }

    const roleResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`,
      { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" },
    )
    const roleBody = await roleResponse.json().catch(() => null)
    const firestoreRole = roleBody?.fields?.role?.stringValue || null

    return NextResponse.json(
      {
        ok: true,
        stage: "complete",
        firebaseProjectId: FIREBASE_PROJECT_ID,
        authenticatedEmailMatches: authenticatedEmail === ADMIN_EMAIL,
        uidPresent: Boolean(uid),
        allowlistedAdmin: authenticatedEmail === ADMIN_EMAIL,
        firestoreRoleStatus: roleResponse.status,
        firestoreRole,
        sessionRole: authenticatedEmail === ADMIN_EMAIL || firestoreRole === "admin" ? "admin" : "user",
      },
      { headers: responseHeaders },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: "diagnostic_exception", message: error instanceof Error ? error.message : "unknown" },
      { status: 200, headers: responseHeaders },
    )
  }
}
