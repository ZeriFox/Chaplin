"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Mail, Phone, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from "@/components/auth-provider"

export function AdminSecuritySettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // Email change state
  const [newEmail, setNewEmail] = useState("")
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState("")
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  
  // Password change state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordOtpSent, setPasswordOtpSent] = useState(false)
  const [passwordOtp, setPasswordOtp] = useState("")
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  
  // Phone change state
  const [newPhone, setNewPhone] = useState("")
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [phoneOtp, setPhoneOtp] = useState("")
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)

  // Validate password
  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError("La password deve essere di almeno 8 caratteri")
      return false
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("La password deve contenere almeno una lettera maiuscola")
      return false
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("La password deve contenere almeno una lettera minuscola")
      return false
    }
    const numbers = password.match(/\d/g)
    if (!numbers || numbers.length < 2) {
      setPasswordError("La password deve contenere almeno 2 numeri")
      return false
    }
    const letters = password.match(/[a-zA-Z]/g)
    if (!letters || letters.length < 3) {
      setPasswordError("La password deve contenere almeno 3 lettere")
      return false
    }
    setPasswordError("")
    return true
  }

  const handleSendEmailOtp = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      alert("Inserisci un indirizzo email valido")
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch("/api/admin/send-otp-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, userId: user?.uid, method: "sms" }),
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || "Errore nell'invio dell'OTP")
      
      setEmailOtpSent(true)
      setEmailDialogOpen(true)
      alert(data.message || "Codice OTP inviato via SMS")
    } catch (error: any) {
      console.error("[v0] Error sending email OTP:", error)
      alert(error.message || "Errore nell'invio del codice OTP")
    } finally {
      setLoading(false)
    }
  }

  // Verify Email OTP and update
  const handleVerifyEmailOtp = async () => {
    if (emailOtp.length !== 4) {
      alert("Inserisci il codice OTP di 4 cifre")
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch("/api/admin/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, otp: emailOtp, userId: user?.uid }),
      })
      
      if (!response.ok) throw new Error("Codice OTP non valido")
      
      alert("Email aggiornata con successo!")
      setEmailDialogOpen(false)
      setNewEmail("")
      setEmailOtp("")
      setEmailOtpSent(false)
    } catch (error) {
      console.error("[v0] Error verifying email OTP:", error)
      alert("Codice OTP non valido")
    } finally {
      setLoading(false)
    }
  }

  const handleSendPasswordOtp = async () => {
    if (!newPassword || !confirmPassword) {
      alert("Compila tutti i campi")
      return
    }
    
    if (newPassword !== confirmPassword) {
      alert("Le password non corrispondono")
      return
    }
    
    if (!validatePassword(newPassword)) {
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch("/api/admin/send-otp-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, userId: user?.uid, method: "email" }),
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || "Errore nell'invio dell'OTP")
      
      setPasswordOtpSent(true)
      setPasswordDialogOpen(true)
      alert(data.message || "Codice OTP inviato via Email")
    } catch (error: any) {
      console.error("[v0] Error sending password OTP:", error)
      alert(error.message || "Errore nell'invio del codice OTP")
    } finally {
      setLoading(false)
    }
  }

  // Verify Password OTP and update
  const handleVerifyPasswordOtp = async () => {
    if (passwordOtp.length !== 4) {
      alert("Inserisci il codice OTP di 4 cifre")
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch("/api/admin/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, otp: passwordOtp, userId: user?.uid }),
      })
      
      if (!response.ok) throw new Error("Codice OTP non valido")
      
      alert("Password aggiornata con successo!")
      setPasswordDialogOpen(false)
      setNewPassword("")
      setConfirmPassword("")
      setPasswordOtp("")
      setPasswordOtpSent(false)
    } catch (error) {
      console.error("[v0] Error verifying password OTP:", error)
      alert("Codice OTP non valido")
    } finally {
      setLoading(false)
    }
  }

  const handleSendPhoneOtp = async () => {
    if (!newPhone || !/^\+?[\d\s\-()]+$/.test(newPhone)) {
      alert("Inserisci un numero di telefono valido")
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch("/api/admin/send-otp-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPhone, userId: user?.uid, method: "email" }),
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || "Errore nell'invio dell'OTP")
      
      setPhoneOtpSent(true)
      setPhoneDialogOpen(true)
      alert(data.message || "Codice OTP inviato via Email")
    } catch (error: any) {
      console.error("[v0] Error sending phone OTP:", error)
      alert(error.message || "Errore nell'invio del codice OTP")
    } finally {
      setLoading(false)
    }
  }

  // Verify Phone OTP and update
  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 4) {
      alert("Inserisci il codice OTP di 4 cifre")
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch("/api/admin/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPhone, otp: phoneOtp, userId: user?.uid }),
      })
      
      if (!response.ok) throw new Error("Codice OTP non valido")
      
      alert("Numero di telefono aggiornato con successo!")
      setPhoneDialogOpen(false)
      setNewPhone("")
      setPhoneOtp("")
      setPhoneOtpSent(false)
    } catch (error) {
      console.error("[v0] Error verifying phone OTP:", error)
      alert("Codice OTP non valido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-cinzel text-primary">Sicurezza Account Admin</CardTitle>
          <CardDescription>Modifica email, password e numero di telefono con verifica OTP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Change Email */}
          <div className="space-y-4 pb-6 border-b">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Modifica Email</h3>
            </div>
            <div>
              <Label htmlFor="currentEmail" className="text-muted-foreground">Email Attuale</Label>
              <Input
                id="currentEmail"
                className="mt-2 bg-muted/50 cursor-not-allowed"
                value={user?.email || ""}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="newEmail">Nuova Email</Label>
              <Input
                id="newEmail"
                type="email"
                className="mt-2"
                placeholder="nuova@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Il codice OTP verrà inviato via SMS al tuo numero registrato</p>
            <Button onClick={handleSendEmailOtp} disabled={loading || !newEmail} className="w-full sm:w-auto">
              {loading ? "Invio..." : "Invia Codice OTP via SMS"}
            </Button>
          </div>

          {/* Change Password */}
          <div className="space-y-4 pb-6 border-b">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Modifica Password</h3>
            </div>
            <div>
              <Label htmlFor="newPassword">Nuova Password</Label>
              <Input
                id="newPassword"
                type="password"
                className="mt-2"
                placeholder="Almeno 8 caratteri"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {passwordError && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Conferma Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="mt-2"
                placeholder="Ripeti la password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>La password deve contenere:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Almeno 8 caratteri</li>
                <li>Almeno 1 lettera maiuscola e 1 minuscola</li>
                <li>Almeno 2 numeri</li>
                <li>Almeno 3 lettere</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">Il codice OTP verrà inviato via email alla tua email registrata</p>
            <Button onClick={handleSendPasswordOtp} disabled={loading || !newPassword || !confirmPassword} className="w-full sm:w-auto">
              {loading ? "Invio..." : "Invia Codice OTP via Email"}
            </Button>
          </div>

          {/* Change Phone */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Modifica Numero di Telefono</h3>
            </div>
            <div>
              <Label htmlFor="newPhone">Nuovo Numero di Telefono</Label>
              <Input
                id="newPhone"
                type="tel"
                className="mt-2"
                placeholder="+39 123 456 7890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Il codice OTP verrà inviato via email alla tua email registrata</p>
            <Button onClick={handleSendPhoneOtp} disabled={loading || !newPhone} className="w-full sm:w-auto">
              {loading ? "Invio..." : "Invia Codice OTP via Email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email OTP Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Modifica Email</DialogTitle>
            <DialogDescription>
              Inserisci il codice OTP di 4 cifre inviato via SMS al tuo numero registrato
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={emailOtp} onChange={setEmailOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyEmailOtp} disabled={loading || emailOtp.length !== 4} className="w-full">
              {loading ? "Verifica..." : "Conferma e Aggiorna Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password OTP Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Modifica Password</DialogTitle>
            <DialogDescription>
              Inserisci il codice OTP di 4 cifre inviato via email alla tua email registrata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={passwordOtp} onChange={setPasswordOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyPasswordOtp} disabled={loading || passwordOtp.length !== 4} className="w-full">
              {loading ? "Verifica..." : "Conferma e Aggiorna Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone OTP Dialog */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Modifica Numero</DialogTitle>
            <DialogDescription>
              Inserisci il codice OTP di 4 cifre inviato via email alla tua email registrata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <InputOTP maxLength={4} value={phoneOtp} onChange={setPhoneOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyPhoneOtp} disabled={loading || phoneOtp.length !== 4} className="w-full">
              {loading ? "Verifica..." : "Conferma e Aggiorna Numero"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
