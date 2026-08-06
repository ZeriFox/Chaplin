import { NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type AppRole = "user" | "admin"

function getCookieDomain(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host")
  const host = (forwardedHost || req.headers.get("host") || "").split(",")[0].trim().split(":")[0].toLowerCase()

  if (host === "chaplinluxuryholidayhouse.it" || host.endsWith(".chaplinluxuryholidayhouse.it")) {
    return "chaplinluxuryholidayhouse.it"
  }

  return undefined
}

function cookieOptions(req: Request, maxAge: number) {
  const domain = getCookieDomain(req)

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    ...(domain ? { domain } : {}),
  }
}

function clearSessionCookies(req: Request, response: NextResponse) {
  response.cookies.set("id_token", "", cookieOptions(req, 0))
  response.cookies.set("app_role", "", cookieOptions(req, 0))
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string }
    const token = body.token?.trim()

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token mancante" }, { status: 400 })
    }

    const decoded = await getAdminAuth().verifyIdToken(token, true)
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get()
    const role: AppRole = userDoc.exists && userDoc.data()?.role === "admin" ? "admin" : "user"

    const response = NextResponse.json({ ok: true, role })
    response.headers.set("Cache-Control", "no-store")
    response.cookies.set("id_token", token, cookieOptions(req, 60 * 60))
    response.cookies.set("app_role", role, cookieOptions(req, 60 * 60))
    return response
  } catch (error) {
    console.error("[session] Invalid Firebase session", error)
    const response = NextResponse.json({ ok: false, error: "Sessione non valida" }, { status: 401 })
    response.headers.set("Cache-Control", "no-store")
    clearSessionCookies(req, response)
    return response
  }
}

export async function DELETE(req: Request) {
  const response = NextResponse.json({ ok: true })
  response.headers.set("Cache-Control", "no-store")
  clearSessionCookies(req, response)
  return response
}
