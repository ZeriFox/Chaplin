"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: {
    checkIn: string
    checkOut: string
    guests: number
    nights: number
    roomId: string
    subtotal: number
    touristTax: number
    serviceFee: number
    total: number
    firstName: string
    lastName: string
    email: string
    phone: string
    notes: string
  }
}

export function BookingModal({ isOpen, onClose, bookingData }: BookingModalProps) {
  const { t } = useLanguage()

  const [step, setStep] = useState(1)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFirstName(bookingData.firstName)
    setLastName(bookingData.lastName)
    setEmail(bookingData.email)
    setPhone(bookingData.phone)
    setNotes(bookingData.notes)
    if (bookingData.firstName && bookingData.lastName && bookingData.email) {
      setStep(2)
    }
  }, [
    isOpen,
    bookingData.firstName,
    bookingData.lastName,
    bookingData.email,
    bookingData.phone,
    bookingData.notes,
  ])

  const handleNext = () => {
    if (step === 1) {
      if (!firstName || !lastName || !email) {
        toast.error(t("pleaseEnterGuestInfo") || "Inserisci nome, cognome ed email")
        return
      }
      if (!email.includes("@")) {
        toast.error(t("invalidEmail") || "Email non valida")
        return
      }
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleConfirmBooking = async () => {
    setIsProcessing(true)

    try {
      const roomType = bookingData.roomId === "1" ? "deluxe" : "suite"
      const roomName =
        bookingData.roomId === "1" ? "Camera Familiare con Balcone" : "Camera Matrimoniale con Vasca Idromassaggio"
      const response = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          guests: bookingData.guests,
          children: 0,
          firstName,
          lastName,
          email,
          phone,
          specialRequests: notes,
          nights: bookingData.nights,
          roomId: bookingData.roomId,
          roomType,
          roomName,
          pricePerNight: Math.round(bookingData.subtotal / bookingData.nights),
          subtotal: Math.round(bookingData.subtotal * 100),
          taxes: Math.round(bookingData.touristTax * 100),
          serviceFee: Math.round(bookingData.serviceFee * 100),
          totalAmount: Math.round(bookingData.total * 100),
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const requestCode = result.bookingId ? ` Codice richiesta: ${result.bookingId}.` : ""
        throw new Error(`${result.error || "Impossibile inviare la richiesta."}${requestCode}`)
      }

      toast.success("Richiesta inviata. Abbiamo spedito il riepilogo via email.")
      onClose()
    } catch (error) {
      console.error("[booking] Request error:", error)
      toast.error(error instanceof Error ? error.message : "Errore durante l'invio della richiesta")
    } finally {
      setIsProcessing(false)
    }
  }

  const formatMoney = (n: number) => `€${Intl.NumberFormat("it-IT", { minimumFractionDigits: 0 }).format(n)}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && (t("guestInformation") || "Informazioni Ospite")}
            {step === 2 && "Riepilogo prenotazione"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && (t("enterGuestDetails") || "Inserisci i tuoi dati per continuare con la prenotazione")}
            {step === 2 && "Controlla i dati e invia la richiesta. Nessun pagamento verrà effettuato."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Guest Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="modal-firstName">{t("bookingFormFirstName") || "Nome"}</Label>
                <Input
                  id="modal-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("enterFirstName") || "Inserisci nome"}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="modal-lastName">{t("bookingFormLastName") || "Cognome"}</Label>
                <Input
                  id="modal-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("enterLastName") || "Inserisci cognome"}
                />
              </div>
              <div>
                <Label htmlFor="modal-email">{t("bookingFormEmail") || "Email"}</Label>
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("enterEmail") || "Inserisci email"}
                />
              </div>
            </div>
          )}

          {/* Step 2: Booking request summary */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Booking Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm mb-3">{t("bookingSummary") || "Riepilogo Prenotazione"}</h4>
                <div className="flex justify-between text-sm">
                  <span>Periodo</span>
                  <span>
                    {bookingData.checkIn} – {bookingData.checkOut}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ospiti</span>
                  <span>{bookingData.guests}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("subtotal")}</span>
                  <span>{formatMoney(bookingData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("touristTax") || "Tassa di soggiorno"}</span>
                  <span>{formatMoney(bookingData.touristTax)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t("serviceFee")}</span>
                  <span>{formatMoney(bookingData.serviceFee)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold">
                  <span>{t("total")}</span>
                  <span className="text-primary">{formatMoney(bookingData.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex items-center gap-2 bg-transparent"
              disabled={isProcessing}
            >
              <ChevronLeft className="w-4 h-4" />
              {t("back") || "Indietro"}
            </Button>
          )}
          {step === 1 && (
            <Button onClick={handleNext} className="ml-auto flex items-center gap-2">
              {t("next") || "Avanti"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleConfirmBooking} className="ml-auto flex items-center gap-2" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("processing") || "Elaborazione..."}
                </>
              ) : (
                "Invia richiesta"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

