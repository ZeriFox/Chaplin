/**
 * Nexi XPay API Client
 * Hosted Payment Page (HPP) integration for Italy
 *
 * Docs: https://developer.nexi.it/en/api/introduzione
 * HPP Flow: https://developer.nexi.it/en/modalita-di-integrazione/hosted-payment-page
 *
 * Environments:
 *   - Test: https://xpaysandbox.nexi.it/api/phoenix-0.0/psp/api/v1/
 *   - Prod: https://xpay.nexi.it/api/phoenix-0.0/psp/api/v1/
 */

const NEXI_API_KEY = process.env.NEXI_API_KEY || ""
const IS_PRODUCTION = process.env.NODE_ENV === "production" && NEXI_API_KEY && !NEXI_API_KEY.includes("sandbox")

const NEXI_BASE_URL = IS_PRODUCTION
  ? "https://xpay.nexi.it/api/phoenix-0.0/psp/api/v1"
  : "https://xpaysandbox.nexi.it/api/phoenix-0.0/psp/api/v1"

/** Returns true if Nexi is configured (API key present) */
export function isNexiConfigured(): boolean {
  return !!process.env.NEXI_API_KEY
}

function generateCorrelationId(): string {
  return `chaplin-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
}

function generateIdempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`
}

/**
 * Create an HPP (Hosted Payment Page) order on Nexi.
 * Returns a redirect URL where the customer completes payment.
 */
export async function createHPPOrder(params: {
  bookingId: string
  amount: number // Amount in EUR cents (e.g. 15000 for 150.00 EUR)
  currency?: string
  description?: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  callbackUrl: string
}): Promise<{
  hostedPage: string
  securityToken: string
  orderId: string
}> {
  const correlationId = generateCorrelationId()

  const body = {
    order: {
      orderId: `CHAP-${params.bookingId}-${Date.now()}`,
      amount: String(params.amount),
      currency: params.currency || "EUR",
      description: params.description || `Prenotazione Chaplin Luxury Holiday House #${params.bookingId}`,
      customerInfo: params.customerEmail
        ? { cardHolderEmail: params.customerEmail }
        : undefined,
    },
    paymentSession: {
      actionType: "PAY",
      amount: String(params.amount),
      recurrence: {
        action: "NO_RECURRING",
      },
      language: "ITA",
      resultUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      notificationUrl: params.callbackUrl,
    },
  }

  console.log("[Nexi] Creating HPP order:", {
    orderId: body.order.orderId,
    amount: params.amount,
    currency: body.order.currency,
  })

  const response = await fetch(`${NEXI_BASE_URL}/orders/hpp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": NEXI_API_KEY,
      "Correlation-Id": correlationId,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[Nexi] HPP order creation failed:", response.status, errorBody)
    throw new Error(`Nexi HPP order creation failed: ${response.status} - ${errorBody}`)
  }

  const data = await response.json()

  console.log("[Nexi] HPP order created successfully:", {
    hostedPage: data.hostedPage ? "URL received" : "missing",
    securityToken: data.securityToken ? "received" : "missing",
  })

  return {
    hostedPage: data.hostedPage,
    securityToken: data.securityToken,
    orderId: body.order.orderId,
  }
}

/**
 * Get the status of an order on Nexi.
 */
export async function getOrderStatus(orderId: string): Promise<{
  orderStatus: {
    order: {
      orderId: string
      amount: string
      currency: string
    }
    result: string
    operations?: Array<{
      operationId: string
      operationType: string
      operationResult: string
      operationAmount: string
      operationCurrency: string
      operationTime: string
    }>
  }
}> {
  const correlationId = generateCorrelationId()

  const response = await fetch(`${NEXI_BASE_URL}/orders/${orderId}/status`, {
    method: "GET",
    headers: {
      "X-Api-Key": NEXI_API_KEY,
      "Correlation-Id": correlationId,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[Nexi] Get order status failed:", response.status, errorBody)
    throw new Error(`Nexi get order status failed: ${response.status} - ${errorBody}`)
  }

  return response.json()
}

/**
 * Refund a Nexi payment operation.
 * @param operationId The operation ID from the original payment
 * @param amount Amount to refund in cents
 * @param currency Currency (default EUR)
 * @param description Optional refund description
 */
export async function refundOperation(
  operationId: string,
  amount: number,
  currency = "EUR",
  description?: string,
): Promise<{
  operationId: string
  operationType: string
  operationResult: string
}> {
  const correlationId = generateCorrelationId()
  const idempotencyKey = generateIdempotencyKey()

  const body = {
    amount: String(amount),
    currency,
    description: description || "Rimborso prenotazione Chaplin Luxury Holiday House",
  }

  console.log("[Nexi] Refunding operation:", {
    operationId,
    amount,
    currency,
  })

  const response = await fetch(`${NEXI_BASE_URL}/operations/${operationId}/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": NEXI_API_KEY,
      "Correlation-Id": correlationId,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("[Nexi] Refund failed:", response.status, errorBody)
    throw new Error(`Nexi refund failed: ${response.status} - ${errorBody}`)
  }

  const data = await response.json()

  console.log("[Nexi] Refund completed:", data)

  return data
}

/**
 * Find the payment operation from an order (used to get operationId for refunds)
 */
export async function findPaymentOperation(orderId: string): Promise<{
  operationId: string
  amount: string
  currency: string
} | null> {
  try {
    const status = await getOrderStatus(orderId)

    if (status.orderStatus?.operations) {
      const payOp = status.orderStatus.operations.find(
        (op) => op.operationType === "AUTHORIZATION" && op.operationResult === "AUTHORIZED",
      ) || status.orderStatus.operations.find(
        (op) => op.operationType === "CAPTURE" && op.operationResult === "EXECUTED",
      )

      if (payOp) {
        return {
          operationId: payOp.operationId,
          amount: payOp.operationAmount,
          currency: payOp.operationCurrency,
        }
      }
    }

    return null
  } catch (error) {
    console.error("[Nexi] Error finding payment operation:", error)
    return null
  }
}
