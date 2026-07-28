import { type NextRequest, NextResponse } from "next/server"
import { createHPPOrder } from "@/lib/nexi-client"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXI_API_KEY) {
      return NextResponse.json(
        { error: "Nexi non è configurato correttamente. Contatta il supporto." },
        { status: 500 },
      )
    }

    const body = await request.json()
    const {
      amount,
      currency,
      bookingId,
      successUrl,
      cancelUrl,
      customerEmail,
    } = body

    if (!amount || !currency || !bookingId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    console.log("[Nexi] Creating payment:", {
      amount,
      currency,
      bookingId,
      hasCustomerEmail: !!customerEmail,
    })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://al22suite.com"
    const callbackUrl = `${siteUrl}/api/payments/nexi/callback`

    const result = await createHPPOrder({
      bookingId,
      amount,
      currency: currency || "EUR",
      customerEmail,
      successUrl,
      cancelUrl,
      callbackUrl,
    })

    console.log("[Nexi] HPP order created, redirecting to hosted page")

    return NextResponse.json({
      url: result.hostedPage,
      orderId: result.orderId,
      securityToken: result.securityToken,
    })
  } catch (error: any) {
    console.error("[Nexi] API route error:", error)

    return NextResponse.json(
      { error: error.message || "Errore durante la creazione del pagamento Nexi" },
      { status: 500 },
    )
  }
}
