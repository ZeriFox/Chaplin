import { NextResponse } from "next/server"

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type AppRole = "user" | "admin"

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  }
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.set("id_token", "", cookieOptions(0))
  response.cookies.set("app_role", "", cookieOptions(0))
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
    response.cookies.set("id_token", token, cookieOptions(60 * 60))
    response.cookies.set("app_role", role, cookieOptions(60 * 60))
    return response
  } catch (error) {
    console.error("[session] Invalid Firebase session", error)
    const response = NextResponse.json({ ok: false, error: "Sessione non valida" }, { status: 401 })
    clearSessionCookies(response)
    return response
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  clearSessionCookies(response)
  return response
}
