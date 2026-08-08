import { createHash, timingSafeEqual } from "node:crypto"

export const OTP_LENGTH = 6
export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RATE_WINDOW_MS = 10 * 60 * 1000
export const OTP_RATE_MAX = 6

export function isOtpCode(value: string) {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value)
}

export function hashOtpValue(secret: string, code: string, challengeId: string, uid: string) {
  return createHash("sha256").update(`${secret}|${challengeId}|${uid}|${code}`).digest("hex")
}

export function safeCompareOtpHash(left: string, right: string) {
  try {
    const a = Buffer.from(left, "hex")
    const b = Buffer.from(right, "hex")
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function isOtpExpired(expiresAt: number, now = Date.now()) {
  return expiresAt < now
}

export function hasOtpAttemptsRemaining(attempts: number, maxAttempts = OTP_MAX_ATTEMPTS) {
  return attempts < maxAttempts
}
