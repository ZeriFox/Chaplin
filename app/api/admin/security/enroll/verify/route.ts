import { NextResponse } from "next/server"

import {
  enableAdminTwoFactor,
  TwoFactorError,
  verifyOtpChallenge,
  type OtpMethod,
} from "@/lib/admin-two-factor"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request, { allowPasswordChangeRequired: true })
    const body = (await request.json()) as { challengeId?: string; otp?: string }
    const challengeId = body.challengeId?.trim()
    const otp = body.otp?.trim()

    if (!challengeId || !otp) {
      return NextResponse.json({ error: "Codice OTP e richiesta sono obbligatori" }, { status: 400 })
    }

    const challenge = await verifyOtpChallenge({
      uid: admin.uid,
      purpose: "enroll",
      challengeId,
      code: otp,
    })

    const method: OtpMethod = challenge.method === "sms" ? "sms" : "email"
    const destination = String(challenge.destination || "")
    const profile = await enableAdminTwoFactor(admin.uid, method, destination)

    return NextResponse.json({ ok: true, ...profile })
  } catch (error) {
    if (error instanceof TwoFactorError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}
