"use client"

import type React from "react"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, KeyRound, Loader2, LogIn, RefreshCw, Shield } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"

export default function AdminLoginPage() {
  const { t } = useLanguage()
  const params = useSearchParams()
  const requestedNext = params.get("next") || "/admin"
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/admin"
  const {
    adminLogin,
    verifyAdminOtp,
    resendAdminOtp,
    pendingAdminOtp,
    logout,
    isLoading,
  } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [otp, setOtp] = useState("")
  const [form, setForm] = useState({ email: "", password: "" })

  const credentialsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    const result = await adminLogin(form.email, form.password)

    if (!result.success) {
      setError(result.error || t("invalidOrInsufficient"))
      return
    }
    if (!result.requiresOtp) window.location.assign(next)
  }

  const otpSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    const result = await verifyAdminOtp(otp)
    if (!result.success) {
      setError(result.error || "Codice OTP non valido")
      return
    }
    window.location.assign(next)
  }

  const resend = async () => {
    setError("")
    setOtp("")
    const result = await resendAdminOtp()
    if (!result.success) setError(result.error || "Invio del codice non riuscito")
  }

  const restart = async () => {
    await logout().catch(() => undefined)
    setOtp("")
    setError("")
    setForm((current) => ({ ...current, password: "" }))
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pb-16 pt-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center animate-fade-in-up">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h1 className="text-3xl font-cinzel font-bold text-roman-gradient">{t("adminAccess")}</h1>
              </div>
              <p className="text-muted-foreground">Area riservata protetta da password e codice OTP.</p>
            </div>

            <Card className="card-enhanced animate-bounce-in">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-cinzel text-primary">
                  {pendingAdminOtp ? "VERIFICA OTP" : t("adminPanel")}
                </CardTitle>
                <CardDescription>
                  {pendingAdminOtp
                    ? `Inserisci il codice inviato via ${pendingAdminOtp.method === "sms" ? "SMS" : "email"} a ${pendingAdminOtp.maskedDestination}`
                    : t("enterAdminCredentials")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!pendingAdminOtp ? (
                  <form onSubmit={credentialsSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="admin-email" className="text-sm">{t("email")}</label>
                      <Input
                        id="admin-email"
                        type="email"
                        autoComplete="username"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="admin-password" className="text-sm">{t("password")}</label>
                      <div className="relative mt-1">
                        <Input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={form.password}
                          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                          required
                        />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword((current) => !current)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent shadow-lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                      {isLoading ? t("loggingIn") : t("login")}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={otpSubmit} className="space-y-5">
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

                    <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent shadow-lg" disabled={isLoading || otp.length !== 6}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                      Conferma codice e accedi
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" className="flex-1" onClick={resend} disabled={isLoading}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Invia un nuovo codice
                      </Button>
                      <Button type="button" variant="ghost" className="flex-1" onClick={restart} disabled={isLoading}>
                        Torna alle credenziali
                      </Button>
                    </div>
                  </form>
                )}

                <div className="mt-6 text-center text-xs text-muted-foreground">
                  {t("notAdmin")}{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">{t("backToUserLogin")}</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
