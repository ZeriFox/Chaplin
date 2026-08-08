import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"

import { getAdminDb } from "@/lib/firebase-admin"
import { CouponError, normalizeCouponCode, normalizeCouponInput } from "@/lib/coupons"
import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    await requireAdminApi(request)
    const snapshot = await getAdminDb().collection("coupons").get()
    const coupons = snapshot.docs
      .map((document) => ({ code: document.id, ...document.data() }))
      .sort((left: any, right: any) => String(left.code).localeCompare(String(right.code)))
    return NextResponse.json(coupons)
  } catch (error) {
    return adminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const coupon = normalizeCouponInput((await request.json()) as Record<string, unknown>)
    const ref = getAdminDb().collection("coupons").doc(coupon.code)
    const existing = await ref.get()
    if (existing.exists) {
      return NextResponse.json({ error: "Esiste già un coupon con questo codice" }, { status: 409 })
    }

    await ref.set({
      ...coupon,
      usageCount: 0,
      createdBy: admin.uid,
      updatedBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return NextResponse.json({ ok: true, coupon: { ...coupon, usageCount: 0 } })
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminApi(request)
    const raw = (await request.json()) as Record<string, unknown>
    const coupon = normalizeCouponInput(raw)
    const ref = getAdminDb().collection("coupons").doc(coupon.code)
    const existing = await ref.get()
    if (!existing.exists) return NextResponse.json({ error: "Coupon non trovato" }, { status: 404 })

    await ref.set(
      {
        ...coupon,
        usageCount: Number(existing.data()?.usageCount || 0),
        updatedBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminApi(request)
    const code = normalizeCouponCode(new URL(request.url).searchParams.get("code"))
    await getAdminDb().collection("coupons").doc(code).delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return adminApiErrorResponse(error)
  }
}
