import { NextResponse } from "next/server"

import {
  createOtpChallenge,
  getAdminSecurityProfile,
  TwoFactorError,
} from "@/lib/admin-two-factor"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const profile = await getAdminSecurityProfile(admin.uid)

    if (!profile.twoFactorEnabled || !profile.method || !profile.destination) {
      return NextResponse.json(
        { error: "Attiva prima l’autenticazione a due fattori" },
        { status: 400 },
      )
    }

    const challenge = await createOtpChallenge({
      uid: admin.uid,
      purpose: "password_change",
      method: profile.method,
      destination: profile.destination,
    })

    return NextResponse.json({ ok: true, ...challenge })
  } catch (error) {
    if (error instanceof TwoFactorError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}
