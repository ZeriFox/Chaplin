import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { token, role } = await req.json() as { token: string; role: "user" | "admin" }
  const res = NextResponse.json({ ok: true })
  res.cookies.set("id_token", token, { httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 3600 })
  res.cookies.set("app_role", role, { httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 3600 })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set("id_token", "", { path: "/", maxAge: 0 })
  res.cookies.set("app_role", "", { path: "/", maxAge: 0 })
  return res
}
