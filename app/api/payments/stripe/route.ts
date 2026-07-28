import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.error("[v0] STRIPE_SECRET_KEY is not set in environment variables")
}
if (stripeSecretKey && !stripeSecretKey.startsWith("sk_")) {
  console.error("[v0] STRIPE_SECRET_KEY appears to be invalid (should start with sk_test_ or sk_live_)")
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
    })
  : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe non è configurato correttamente. Contatta il supporto." },
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
      paymentType, // Added paymentType to determine if it's deposit or full payment
    } = body

    if (!amount || !currency || !bookingId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    const isDeposit = paymentType === "deposit"
    const finalAmount = isDeposit ? Math.round(amount * 0.3) : amount

    console.log("[v0] Creating Stripe session:", {
      amount,
      finalAmount,
      isDeposit,
      currency,
      bookingId,
      hasCustomerEmail: !!customerEmail,
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        "card",
        "klarna",
        "paypal",
        "link",
        "bancontact",
        "eps",
        "giropay",
        "ideal",
        "p24",
        "sofort",
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,

      client_reference_id: String(bookingId),
      metadata: {
        bookingId: String(bookingId),
        paymentType: isDeposit ? "deposit" : "full",
        fullAmount: String(amount),
      },

      customer_email: customerEmail,
      locale: "it",
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },

      payment_method_options: {
        card: { request_three_d_secure: "automatic" },
      },

      line_items: [
        {
          price_data: {
            currency: String(currency).toLowerCase(),
            product_data: {
              name: isDeposit ? "Acconto Prenotazione Camera (30%)" : "Saldo Prenotazione Camera (70%)",
              description: isDeposit
                ? `Acconto per Prenotazione #${bookingId} - Saldo dovuto 7 giorni prima del check-in`
                : `Saldo finale per Prenotazione #${bookingId}`,
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("[v0] Stripe API route error:", error)

    if (error.type === "StripeAuthenticationError") {
      return NextResponse.json({ error: "Chiave API Stripe non valida. Verifica la configurazione." }, { status: 401 })
    }

    return NextResponse.json(
      { error: error.message || "Errore durante la creazione del pagamento Stripe" },
      { status: 500 },
    )
  }
}
