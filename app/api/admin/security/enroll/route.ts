import { NextResponse } from "next/server"

import {
  createOtpChallenge,
  isEmailOtpConfigured,
  isSmsConfigured,
  normalizeDestination,
  type OtpMethod,
  TwoFactorError,
} from "@/lib/admin-two-factor"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request, { allowPasswordChangeRequired: true })
    const body = (await request.json()) as { method?: OtpMethod; destination?: string }
    const method: OtpMethod = body.method === "sms" ? "sms" : "email"

    if (method === "sms" && !isSmsConfigured()) {
      return NextResponse.json({ error: "Il servizio SMS non è ancora configurato" }, { status: 503 })
    }
    if (method === "email" && !isEmailOtpConfigured()) {
      return NextResponse.json({ error: "Il servizio email OTP non è ancora configurato" }, { status: 503 })
    }

    const destination = normalizeDestination(method, body.destination)
    const challenge = await createOtpChallenge({
      uid: admin.uid,
      purpose: "enroll",
      method,
      destination,
      metadata: { method, destination },
    })

    return NextResponse.json({ ok: true, ...challenge })
  } catch (error) {
    if (error instanceof TwoFactorError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}
