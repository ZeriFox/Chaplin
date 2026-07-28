import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"


// We read role hints from a cookie set by auth-provider (idToken + role)
export function middleware(req: NextRequest) {
const url = req.nextUrl
const path = url.pathname
const role = req.cookies.get("app_role")?.value // "user" | "admin"


// Protect /user
if (path.startsWith("/user")) {
if (!role) return NextResponse.redirect(new URL("/login", req.url))
if (role !== "user") return NextResponse.redirect(new URL("/login", req.url))
}


// Protect /admin
if (path.startsWith("/admin")) {
if (!role) return NextResponse.redirect(new URL("/admin-login", req.url))
if (role !== "admin") return NextResponse.redirect(new URL("/admin-login", req.url))
}


return NextResponse.next()
}


export const config = {
matcher: ["/user/:path*", "/admin/:path*"],
}