import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type AppRole = "user" | "admin"

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBKK8q78f-DuOtzIqV7EDAnUVsVp05-IHs"
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chaplin-viterbo"

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

async function resolveFirebaseUser(token: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    },
  )

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message || `firebase_auth_${response.status}`)
  }

  const body = (await response.json()) as {
    users?: Array<{ localId?: string; email?: string }>
  }
  const firebaseUser = body.users?.[0]

  if (!firebaseUser?.localId) {
    throw new Error("firebase_user_missing")
  }

  return { uid: firebaseUser.localId, email: firebaseUser.email || "" }
}

async function resolveUserRole(token: string, uid: string): Promise<AppRole> {
  const documentUrl =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}` +
    `/databases/(default)/documents/users/${encodeURIComponent(uid)}`

  const response = await fetch(documentUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (response.status === 404) {
    return "user"
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error?.message || `firestore_role_${response.status}`)
  }

  const body = (await response.json()) as {
    fields?: { role?: { stringValue?: string } }
  }

  return body.fields?.role?.stringValue === "admin" ? "admin" : "user"
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string }
    const token = body.token?.trim()

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token mancante" }, { status: 400 })
    }

    // Verify the ID token against the Firebase project used by the browser and
    // read the signed-in user's own role through Firestore REST. This remains
    // secure under Firestore rules and does not depend on service-account
    // variables being copied to a newly migrated Vercel project.
    const firebaseUser = await resolveFirebaseUser(token)
    const role = await resolveUserRole(token, firebaseUser.uid)

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
