import "server-only"

import { NextResponse } from "next/server"

export type SessionRole = "user" | "admin"

function forwardedHost(request: Request) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase()
}

function cookieDomain(request: Request) {
  const host = forwardedHost(request)
  if (host === "chaplinluxuryholidayhouse.it" || host.endsWith(".chaplinluxuryholidayhouse.it")) {
    return "chaplinluxuryholidayhouse.it"
  }
  return undefined
}

function options(request: Request, maxAge: number) {
  const domain = cookieDomain(request)
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    ...(domain ? { domain } : {}),
  }
}

export function readRequestCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || ""
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=")
    if (separator < 0) continue
    const key = item.slice(0, separator).trim()
    if (key !== name) continue
    return decodeURIComponent(item.slice(separator + 1).trim())
  }
  return null
}

export function setAuthenticatedSessionCookies({
  request,
  response,
  idToken,
  role,
  adminSessionToken,
  adminSessionMaxAge = 60 * 60,
}: {
  request: Request
  response: NextResponse
  idToken: string
  role: SessionRole
  adminSessionToken?: string | null
  adminSessionMaxAge?: number
}) {
  response.cookies.set("id_token", idToken, options(request, 60 * 60))
  response.cookies.set("app_role", role, options(request, 60 * 60))

  if (adminSessionToken) {
    response.cookies.set("admin_session", adminSessionToken, options(request, adminSessionMaxAge))
  } else {
    response.cookies.set("admin_session", "", options(request, 0))
  }
}

export function clearAuthenticatedSessionCookies(request: Request, response: NextResponse) {
  response.cookies.set("id_token", "", options(request, 0))
  response.cookies.set("app_role", "", options(request, 0))
  response.cookies.set("admin_session", "", options(request, 0))
}
