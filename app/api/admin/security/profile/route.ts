import { NextResponse } from "next/server"

import { getAdminAuth } from "@/lib/firebase-admin"
import {
  getAdminSecurityProfile,
  isEmailOtpConfigured,
  isSmsConfigured,
  maskDestination,
} from "@/lib/admin-two-factor"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const [profile, firebaseUser] = await Promise.all([
      getAdminSecurityProfile(admin.uid),
      getAdminAuth().getUser(admin.uid),
    ])

    return NextResponse.json({
      twoFactorEnabled: profile.twoFactorEnabled,
      method: profile.method,
      destination: profile.destination,
      maskedDestination:
        profile.method && profile.destination ? maskDestination(profile.method, profile.destination) : null,
      accountEmail: firebaseUser.email || admin.email,
      emailConfigured: isEmailOtpConfigured(),
      smsConfigured: isSmsConfigured(),
    })
  } catch (error) {
    return adminApiErrorResponse(error)
  }
}
