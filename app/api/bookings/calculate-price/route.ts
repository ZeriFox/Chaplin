import { NextResponse } from "next/server"

import { calculateBookingPrice } from "@/lib/pricing-engine"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { checkIn?: string; checkOut?: string; roomId?: string }
    if (!body.checkIn || !body.checkOut) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 })
    }

    const result = await calculateBookingPrice({
      roomId: body.roomId || "2",
      checkIn: body.checkIn,
      checkOut: body.checkOut,
    })

    return NextResponse.json({
      newPrice: result.totalPrice,
      totalPrice: result.totalPrice,
      totalAmount: Math.round(result.totalPrice * 100),
      nights: result.nights,
      pricePerNight: result.pricePerNight,
      basePrice: result.basePrice,
      priceBreakdown: result.priceBreakdown,
    })
  } catch (error) {
    console.error("Error calculating price:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore nel calcolo del prezzo" },
      { status: 400 },
    )
  }
}
