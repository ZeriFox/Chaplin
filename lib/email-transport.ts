import "server-only"

import nodemailer, { type Transporter } from "nodemailer"
import { Resend } from "resend"

type EmailAddress = string | string[]

export type EmailMessage = {
  from?: string
  to: EmailAddress
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

export type EmailProvider = "resend" | "smtp"

export type EmailSendResult = {
  data: { id: string; provider: EmailProvider } | null
  error: { message: string; code?: string } | null
  provider?: EmailProvider
}

let resendClient: Resend | null = null
let smtpClient: Transporter | null = null

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

function getFromAddress() {
  return env("RESEND_FROM_EMAIL", "EMAIL_FROM", "SMTP_FROM_EMAIL", "MAIL_FROM")
}

function getResendClient() {
  const apiKey = env("RESEND_API_KEY")
  if (!apiKey) return null
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

function getSmtpConfig() {
  const host = env("SMTP_HOST", "RESEND_SMTP_HOST", "MAIL_HOST")
  const user = env("SMTP_USER", "RESEND_SMTP_USER", "MAIL_USER")
  const pass = env("SMTP_PASSWORD", "SMTP_PASS", "RESEND_SMTP_PASSWORD", "RESEND_SMTP_PASS", "MAIL_PASSWORD")
  const rawPort = env("SMTP_PORT", "RESEND_SMTP_PORT", "MAIL_PORT") || "587"
  const port = Number(rawPort)

  if (!host || !user || !pass || !Number.isInteger(port) || port <= 0) return null

  const secureValue = env("SMTP_SECURE", "RESEND_SMTP_SECURE", "MAIL_SECURE")
  const secure = secureValue ? secureValue.toLowerCase() === "true" : port === 465

  return { host, port, secure, auth: { user, pass } }
}

function getSmtpClient() {
  const config = getSmtpConfig()
  if (!config) return null
  if (!smtpClient) smtpClient = nodemailer.createTransport(config)
  return smtpClient
}

function errorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; code?: unknown; name?: unknown }
    return {
      message: typeof value.message === "string" ? value.message : "Email provider request failed",
      code: typeof value.code === "string" ? value.code : typeof value.name === "string" ? value.name : undefined,
    }
  }
  return { message: "Email provider request failed" }
}

function publicError(providerErrors: Partial<Record<EmailProvider, ReturnType<typeof errorDetails>>>) {
  if (!providerErrors.resend && !providerErrors.smtp) {
    return { message: "Email service is not configured", code: "EMAIL_NOT_CONFIGURED" }
  }
  if (providerErrors.resend && providerErrors.smtp) {
    return { message: "Both email providers failed", code: "EMAIL_DELIVERY_FAILED" }
  }
  const failure = providerErrors.resend || providerErrors.smtp
  return { message: failure?.message || "Email delivery failed", code: failure?.code || "EMAIL_DELIVERY_FAILED" }
}

export function getEmailConfigStatus() {
  return {
    resend: Boolean(env("RESEND_API_KEY") && getFromAddress()),
    smtp: Boolean(getSmtpConfig() && getFromAddress()),
    from: Boolean(getFromAddress()),
  }
}

export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const from = message.from || getFromAddress()
  if (!from) {
    return { data: null, error: { message: "Email sender is not configured", code: "EMAIL_FROM_MISSING" } }
  }

  const providerErrors: Partial<Record<EmailProvider, ReturnType<typeof errorDetails>>> = {}
  const resend = getResendClient()

  if (resend) {
    try {
      const result = await resend.emails.send({ ...message, from })
      if (!result.error && result.data?.id) {
        return { data: { id: result.data.id, provider: "resend" }, error: null, provider: "resend" }
      }
      providerErrors.resend = errorDetails(result.error)
    } catch (error) {
      providerErrors.resend = errorDetails(error)
    }
  }

  const smtp = getSmtpClient()
  if (smtp) {
    try {
      const result = await smtp.sendMail({
        ...message,
        from,
        replyTo: message.replyTo,
      })
      return {
        data: { id: result.messageId, provider: "smtp" },
        error: null,
        provider: "smtp",
      }
    } catch (error) {
      providerErrors.smtp = errorDetails(error)
    }
  }

  console.error("[Email] Delivery failed", {
    resend: providerErrors.resend,
    smtp: providerErrors.smtp,
    configured: getEmailConfigStatus(),
  })

  return { data: null, error: publicError(providerErrors) }
}
