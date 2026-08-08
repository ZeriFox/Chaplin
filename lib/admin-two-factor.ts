import "server-only"

import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"
import { getEmailConfigStatus, sendEmail } from "@/lib/email-transport"
import {
  hashOtpValue,
  hasOtpAttemptsRemaining,
  isOtpCode,
  isOtpExpired,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_MAX,
  OTP_RATE_WINDOW_MS,
  OTP_TTL_MS,
  safeCompareOtpHash,
} from "@/lib/otp-rules"

export type OtpMethod = "email" | "sms"
export type OtpPurpose = "login" | "enroll" | "password_change"

export type AdminSecurityProfile = {
  twoFactorEnabled: boolean
  method: OtpMethod | null
  destination: string | null
  verifiedAt?: number | null
}

export class TwoFactorError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "TwoFactorError"
    this.status = status
  }
}

const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000

function secretValue() {
  const value = process.env.OTP_SECRET || process.env.FIREBASE_PRIVATE_KEY
  if (!value) {
    throw new TwoFactorError("La chiave di sicurezza OTP non è configurata", 503)
  }
  return value.replace(/\\n/g, "\n")
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function hashOtp(code: string, challengeId: string, uid: string) {
  return hashOtpValue(secretValue(), code, challengeId, uid)
}

export function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TwoFactorError("Inserisci un indirizzo email valido")
  }
  return email
}

export function normalizePhone(value: unknown) {
  const phone = String(value || "")
    .trim()
    .replace(/[\s().-]/g, "")

  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new TwoFactorError("Inserisci il numero completo di prefisso internazionale, ad esempio +393517196320")
  }
  return phone
}

export function normalizeDestination(method: OtpMethod, value: unknown) {
  return method === "email" ? normalizeEmail(value) : normalizePhone(value)
}

export function maskDestination(method: OtpMethod, destination: string) {
  if (method === "email") {
    const [local, domain] = destination.split("@")
    const visible = local.slice(0, Math.min(2, local.length))
    return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`
  }

  if (destination.length <= 7) return destination
  return `${destination.slice(0, 4)}${"*".repeat(Math.max(3, destination.length - 7))}${destination.slice(-3)}`
}

export function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID),
  )
}

export function isEmailOtpConfigured() {
  const status = getEmailConfigStatus()
  return status.resend || status.smtp
}

async function sendSms(destination: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

  if (!accountSid || !authToken || (!from && !messagingServiceSid)) {
    throw new TwoFactorError("Il servizio SMS non è configurato", 503)
  }

  const params = new URLSearchParams({ To: destination, Body: body })
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid)
  else if (from) params.set("From", from)

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new TwoFactorError(data?.message || "Non è stato possibile inviare l’SMS", 502)
  }
}

function purposeCopy(purpose: OtpPurpose) {
  if (purpose === "login") return "accesso al pannello amministratore"
  if (purpose === "password_change") return "modifica della password amministratore"
  return "attivazione dell’autenticazione a due fattori"
}

async function deliverOtp(method: OtpMethod, destination: string, code: string, purpose: OtpPurpose) {
  const action = purposeCopy(purpose)

  if (method === "sms") {
    await sendSms(destination, `CHAPLIN: il codice per ${action} è ${code}. Scade tra 10 minuti.`)
    return
  }

  if (!isEmailOtpConfigured()) {
    throw new TwoFactorError("Il servizio email OTP non è configurato", 503)
  }

  const result = await sendEmail({
    to: destination,
    subject: `Codice di sicurezza CHAPLIN: ${code}`,
    text: `Il codice per ${action} è ${code}. Scade tra 10 minuti. Se non hai richiesto questa operazione, ignora il messaggio.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#24231f">
        <div style="background:#1b1a17;padding:24px;text-align:center">
          <img src="https://chaplinluxuryholidayhouse.it/images/chaplin-logo-white.png" alt="CHAPLIN Luxury Holiday House" width="230" style="display:block;max-width:100%;height:auto;margin:0 auto" />
        </div>
        <div style="padding:28px;background:#faf9f5;border:1px solid #e4dcc5">
          <h2 style="margin:0 0 12px">Codice di sicurezza</h2>
          <p>Usa questo codice per confermare ${action}:</p>
          <div style="margin:22px 0;padding:18px;text-align:center;background:#fff;border:1px solid #d7c58d;font-size:34px;font-weight:700;letter-spacing:8px">${code}</div>
          <p style="color:#6f6a61">Il codice scade tra 10 minuti ed è utilizzabile una sola volta.</p>
          <p style="color:#6f6a61">Se non hai richiesto questa operazione, non condividere il codice e ignora il messaggio.</p>
        </div>
      </div>
    `,
  })

  if (result.error) {
    throw new TwoFactorError(result.error.message || "Non è stato possibile inviare l’email OTP", 502)
  }
}

async function enforceRateLimit(uid: string, purpose: OtpPurpose) {
  const db = getAdminDb()
  const key = sha256(`${uid}:${purpose}`).slice(0, 40)
  const ref = db.collection("admin_otp_rate").doc(key)
  const now = Date.now()

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data()
    const windowStartedAt = Number(data?.windowStartedAt || 0)
    const count = Number(data?.count || 0)

    if (!snapshot.exists || now - windowStartedAt >= OTP_RATE_WINDOW_MS) {
      transaction.set(ref, { uid, purpose, windowStartedAt: now, count: 1, updatedAt: FieldValue.serverTimestamp() })
      return
    }

    if (count >= OTP_RATE_MAX) {
      throw new TwoFactorError("Troppe richieste di codice. Attendi alcuni minuti e riprova", 429)
    }

    transaction.update(ref, { count: count + 1, updatedAt: FieldValue.serverTimestamp() })
  })
}

export async function createOtpChallenge({
  uid,
  purpose,
  method,
  destination,
  metadata,
}: {
  uid: string
  purpose: OtpPurpose
  method: OtpMethod
  destination: string
  metadata?: Record<string, unknown>
}) {
  await enforceRateLimit(uid, purpose)

  const normalizedDestination = normalizeDestination(method, destination)
  const challengeId = randomUUID()
  const code = String(randomInt(100000, 1000000))
  const ref = getAdminDb().collection("admin_2fa_challenges").doc(challengeId)
  const now = Date.now()

  await ref.set({
    uid,
    purpose,
    method,
    destination: normalizedDestination,
    codeHash: hashOtp(code, challengeId, uid),
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    consumed: false,
    expiresAt: now + OTP_TTL_MS,
    createdAtMs: now,
    metadata: metadata || {},
    createdAt: FieldValue.serverTimestamp(),
  })

  try {
    await deliverOtp(method, normalizedDestination, code, purpose)
  } catch (error) {
    await ref.delete().catch(() => undefined)
    throw error
  }

  return {
    challengeId,
    method,
    maskedDestination: maskDestination(method, normalizedDestination),
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  }
}

export async function verifyOtpChallenge({
  uid,
  purpose,
  challengeId,
  code,
}: {
  uid: string
  purpose: OtpPurpose
  challengeId: string
  code: string
}): Promise<Record<string, any>> {
  if (!isOtpCode(code)) throw new TwoFactorError("Inserisci il codice OTP di 6 cifre")

  const db = getAdminDb()
  const ref = db.collection("admin_2fa_challenges").doc(challengeId)
  let result: Record<string, any> | null = null
  let failure: TwoFactorError | null = null

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data() as Record<string, any> | undefined
    const now = Date.now()

    if (!snapshot.exists || !data || data.uid !== uid || data.purpose !== purpose) {
      failure = new TwoFactorError("Codice OTP non valido", 400)
      return
    }
    if (data.consumed) {
      failure = new TwoFactorError("Questo codice OTP è già stato utilizzato", 400)
      return
    }
    if (isOtpExpired(Number(data.expiresAt || 0), now)) {
      transaction.update(ref, { consumed: true, consumedReason: "expired", consumedAt: FieldValue.serverTimestamp() })
      failure = new TwoFactorError("Il codice OTP è scaduto", 400)
      return
    }

    const attempts = Number(data.attempts || 0)
    const maxAttempts = Number(data.maxAttempts || OTP_MAX_ATTEMPTS)
    if (!hasOtpAttemptsRemaining(attempts, maxAttempts)) {
      failure = new TwoFactorError("Troppi tentativi. Richiedi un nuovo codice", 429)
      return
    }

    const valid = safeCompareOtpHash(hashOtp(code, challengeId, uid), String(data.codeHash || ""))
    if (!valid) {
      transaction.update(ref, { attempts: attempts + 1, lastAttemptAt: FieldValue.serverTimestamp() })
      failure = new TwoFactorError("Codice OTP non valido", 400)
      return
    }

    transaction.update(ref, {
      consumed: true,
      consumedAt: FieldValue.serverTimestamp(),
      attempts: attempts + 1,
    })
    result = data
  })

  if (failure) throw failure
  if (!result) throw new TwoFactorError("Codice OTP non valido", 400)
  return result as Record<string, any>
}

export async function getAdminSecurityProfile(uid: string): Promise<AdminSecurityProfile> {
  const snapshot = await getAdminDb().collection("admin_security").doc(uid).get()
  const data = snapshot.data()

  if (!snapshot.exists || !data?.twoFactorEnabled) {
    return { twoFactorEnabled: false, method: null, destination: null, verifiedAt: null }
  }

  const method = data.method === "sms" ? "sms" : "email"
  return {
    twoFactorEnabled: true,
    method,
    destination: typeof data.destination === "string" ? data.destination : null,
    verifiedAt: Number(data.verifiedAt || 0) || null,
  }
}

export async function enableAdminTwoFactor(uid: string, method: OtpMethod, destination: string) {
  const normalizedDestination = normalizeDestination(method, destination)
  const now = Date.now()
  const db = getAdminDb()

  await Promise.all([
    db.collection("admin_security").doc(uid).set(
      {
        twoFactorEnabled: true,
        method,
        destination: normalizedDestination,
        verifiedAt: now,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    db.collection("users").doc(uid).set(
      {
        twoFactorEnabled: true,
        twoFactorMethod: method,
        twoFactorDestination: normalizedDestination,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ])

  return {
    twoFactorEnabled: true,
    method,
    destination: normalizedDestination,
    maskedDestination: maskDestination(method, normalizedDestination),
  }
}

export async function createAdminSession(uid: string) {
  const sessionId = randomUUID()
  const secret = randomBytes(32).toString("base64url")
  const now = Date.now()

  await getAdminDb().collection("admin_sessions").doc(sessionId).set({
    uid,
    secretHash: sha256(secret),
    createdAtMs: now,
    expiresAt: now + ADMIN_SESSION_TTL_MS,
    revoked: false,
    createdAt: FieldValue.serverTimestamp(),
  })

  return {
    token: `${sessionId}.${secret}`,
    maxAgeSeconds: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  }
}

export async function verifyAdminSessionCookie(value: string | null | undefined, uid: string) {
  if (!value) return false
  const separator = value.indexOf(".")
  if (separator <= 0) return false

  const sessionId = value.slice(0, separator)
  const secret = value.slice(separator + 1)
  const snapshot = await getAdminDb().collection("admin_sessions").doc(sessionId).get()
  const data = snapshot.data()

  if (!snapshot.exists || !data || data.uid !== uid || data.revoked || Number(data.expiresAt || 0) < Date.now()) {
    return false
  }

  return safeCompareOtpHash(sha256(secret), String(data.secretHash || ""))
}

export async function revokeAdminSessionCookie(value: string | null | undefined) {
  if (!value) return
  const sessionId = value.split(".", 1)[0]
  if (!sessionId) return
  await getAdminDb().collection("admin_sessions").doc(sessionId).set(
    { revoked: true, revokedAt: FieldValue.serverTimestamp() },
    { merge: true },
  ).catch(() => undefined)
}

export async function revokeAllAdminSessions(uid: string) {
  const snapshot = await getAdminDb().collection("admin_sessions").where("uid", "==", uid).get()
  if (snapshot.empty) return

  const batch = getAdminDb().batch()
  snapshot.docs.forEach((document) => {
    batch.set(document.ref, { revoked: true, revokedAt: FieldValue.serverTimestamp() }, { merge: true })
  })
  await batch.commit()
}
