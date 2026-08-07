"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, KeyRound, Loader2, Lock, Mail, Phone, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { getCurrentIdToken } from "@/lib/firebase"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"

 type Profile = {
  twoFactorEnabled: boolean
  method: "email" | "sms" | null
  destination: string | null
  maskedDestination: string | null
  accountEmail: string
  emailConfigured: boolean
  smsConfigured: boolean
}

type Challenge = {
  challengeId: string
  method: "email" | "sms"
  maskedDestination: string
}

async function adminRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getCurrentIdToken(true)
  if (!token) throw new Error("Sessione amministratore scaduta")

  return fetch(input, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

function passwordValidation(value: string) {
  if (value.length < 8) return "La password deve contenere almeno 8 caratteri"
  if (!/[A-Z]/.test(value)) return "Aggiungi almeno una lettera maiuscola"
  if (!/[a-z]/.test(value)) return "Aggiungi almeno una lettera minuscola"
  if (!/\d/.test(value)) return "Aggiungi almeno un numero"
  if (!/[^A-Za-z0-9]/.test(value)) return "Aggiungi almeno un simbolo"
  return ""
}

export function AdminSecuritySettings() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<"email" | "sms">("email")
  const [destination, setDestination] = useState("")
  const [enrollChallenge, setEnrollChallenge] = useState<Challenge | null>(null)
  const [enrollOtp, setEnrollOtp] = useState("")
  const [enrollSending, setEnrollSending] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordChallenge, setPasswordChallenge] = useState<Challenge | null>(null)
  const [passwordOtp, setPasswordOtp] = useState("")
  const [passwordSending, setPasswordSending] = useState(false)

  const loadProfile = async () => {
    setLoading(true)
    try {
      const response = await adminRequest("/api/admin/security/profile")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Impossibile caricare le impostazioni di sicurezza")
      setProfile(data)
      setMethod(data.method || "email")
      setDestination(data.destination || data.accountEmail || "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Caricamento sicurezza non riuscito")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const startEnrollment = async () => {
    setEnrollSending(true)
    try {
      const response = await adminRequest("/api/admin/security/enroll", {
        method: "POST",
        body: JSON.stringify({ method, destination }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Invio del codice non riuscito")
      setEnrollChallenge(data)
      setEnrollOtp("")
      toast.success(`Codice inviato a ${data.maskedDestination}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio del codice non riuscito")
    } finally {
      setEnrollSending(false)
    }
  }

  const verifyEnrollment = async () => {
    if (!enrollChallenge || enrollOtp.length !== 6) return
    setEnrollSending(true)
    try {
      const response = await adminRequest("/api/admin/security/enroll/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId: enrollChallenge.challengeId, otp: enrollOtp }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Codice OTP non valido")
      toast.success("Autenticazione a due fattori attivata")
      setEnrollChallenge(null)
      setEnrollOtp("")
      await loadProfile()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Codice OTP non valido")
    } finally {
      setEnrollSending(false)
    }
  }

  const startPasswordChange = async () => {
    const validation = passwordValidation(newPassword)
    if (validation) return toast.error(validation)
    if (newPassword !== confirmPassword) return toast.error("Le due password non coincidono")

    setPasswordSending(true)
    try {
      const response = await adminRequest("/api/admin/security/password", { method: "POST", body: "{}" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Invio OTP non riuscito")
      setPasswordChallenge(data)
      setPasswordOtp("")
      toast.success(`Codice inviato a ${data.maskedDestination}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio OTP non riuscito")
    } finally {
      setPasswordSending(false)
    }
  }

  const verifyPasswordChange = async () => {
    if (!passwordChallenge || passwordOtp.length !== 6) return
    setPasswordSending(true)
    try {
      const response = await adminRequest("/api/admin/security/password/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeId: passwordChallenge.challengeId,
          otp: passwordOtp,
          newPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Cambio password non riuscito")

      toast.success("Password aggiornata. Accedi nuovamente con la nuova password")
      setPasswordChallenge(null)
      setPasswordOtp("")
      setNewPassword("")
      setConfirmPassword("")
      await logout().catch(() => undefined)
      window.location.assign("/admin-login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cambio password non riuscito")
    } finally {
      setPasswordSending(false)
    }
  }

  if (loading) {
    return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="font-cinzel text-primary">Autenticazione a due fattori</CardTitle>
          </div>
          <CardDescription>
            Dopo l’attivazione, email e password non saranno sufficienti: a ogni nuovo accesso verrà richiesto un codice OTP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`rounded-lg border p-4 ${profile?.twoFactorEnabled ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              {profile?.twoFactorEnabled ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-700" /> : <KeyRound className="mt-0.5 h-5 w-5 text-amber-700" />}
              <div>
                <p className="font-semibold text-foreground">{profile?.twoFactorEnabled ? "2FA attiva" : "2FA non ancora attiva"}</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.twoFactorEnabled
                    ? `I codici vengono inviati via ${profile.method === "sms" ? "SMS" : "email"} a ${profile.maskedDestination}.`
                    : "Registra e verifica un’email oppure un numero di cellulare."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="two-factor-method">Metodo OTP</Label>
              <select
                id="two-factor-method"
                value={method}
                onChange={(event) => {
                  const next = event.target.value as "email" | "sms"
                  setMethod(next)
                  setDestination(next === "email" ? profile?.accountEmail || "" : "")
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="email" disabled={!profile?.emailConfigured}>Email{!profile?.emailConfigured ? " (non configurata)" : ""}</option>
                <option value="sms" disabled={!profile?.smsConfigured}>SMS{!profile?.smsConfigured ? " (Twilio da configurare)" : ""}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="two-factor-destination">{method === "email" ? "Email per i codici OTP" : "Cellulare con prefisso internazionale"}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  {method === "email" ? <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> : <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
                  <Input
                    id="two-factor-destination"
                    type={method === "email" ? "email" : "tel"}
                    className="pl-9"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder={method === "email" ? "nome@email.it" : "+393517196320"}
                  />
                </div>
                <Button onClick={startEnrollment} disabled={enrollSending || !destination || (method === "sms" && !profile?.smsConfigured)}>
                  {enrollSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {profile?.twoFactorEnabled ? "Verifica nuovo metodo" : "Attiva 2FA"}
                </Button>
              </div>
              {method === "sms" && !profile?.smsConfigured && (
                <p className="text-xs text-amber-700">Per gli SMS vanno aggiunte su Vercel le credenziali Twilio. Nel frattempo puoi attivare subito la 2FA via email.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle className="font-cinzel text-primary">Modifica password amministratore</CardTitle>
          </div>
          <CardDescription>Il cambio password viene eseguito soltanto dopo la conferma del codice OTP sul metodo registrato.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile?.twoFactorEnabled ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">Attiva prima l’autenticazione a due fattori nella sezione precedente.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-admin-password">Nuova password</Label>
                  <Input id="new-admin-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-admin-password">Conferma nuova password</Label>
                  <Input id="confirm-admin-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Minimo 8 caratteri, con maiuscola, minuscola, numero e simbolo.</p>
              <Button onClick={startPasswordChange} disabled={passwordSending || !newPassword || !confirmPassword}>
                {passwordSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Invia OTP e cambia password
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(enrollChallenge)} onOpenChange={(open) => { if (!open) setEnrollChallenge(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma il metodo OTP</DialogTitle>
            <DialogDescription>Inserisci il codice di 6 cifre inviato a {enrollChallenge?.maskedDestination}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={enrollOtp} onChange={setEnrollOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full" onClick={verifyEnrollment} disabled={enrollSending || enrollOtp.length !== 6}>
              {enrollSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Conferma e attiva 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordChallenge)} onOpenChange={(open) => { if (!open) setPasswordChallenge(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma cambio password</DialogTitle>
            <DialogDescription>Inserisci il codice di 6 cifre inviato a {passwordChallenge?.maskedDestination}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={passwordOtp} onChange={setPasswordOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full" onClick={verifyPasswordChange} disabled={passwordSending || passwordOtp.length !== 6}>
              {passwordSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Conferma nuova password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
