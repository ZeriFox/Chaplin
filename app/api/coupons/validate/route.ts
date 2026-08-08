import { NextResponse } from "next/server"

import { CouponError, validateCouponCode } from "@/lib/coupons"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; subtotal?: number; checkIn?: string; email?: string }
    const result = await validateCouponCode({
      code: String(body.code || ""),
      subtotal: Number(body.subtotal || 0),
      checkIn: body.checkIn,
      customerEmail: body.email,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ valid: false, error: error.message }, { status: error.status })
    }
    console.error("[coupon] Validation failed", error)
    return NextResponse.json({ valid: false, error: "Non è stato possibile verificare il coupon" }, { status: 500 })
  }
}
