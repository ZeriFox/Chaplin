"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarIcon, Users, MapPin, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { createBooking, type BookingPayload, getAllRooms } from "@/lib/firebase"
import { checkRoomAvailability } from "@/lib/booking-utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BookingCalendarPicker, type DateRange } from "@/components/booking-calendar-picker"
import { useLanguage } from "@/components/language-provider"
import { useDynamicPrice } from "@/hooks/use-dynamic-price"

// Resolve a promise but reject if it doesn't settle within `ms`, so a hanging
// Firestore write (e.g. Firebase unreachable/misconfigured) can never freeze the
// booking flow on "Invio in corso...".
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("BOOKING_SAVE_TIMEOUT")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

// Local fallback request code used when the Firestore write fails, so the
// confirmation email can still be sent and the guest still gets a reference.
function generateFallbackBookingId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `REQ-${Date.now().toString(36).toUpperCase()}-${random}`
}

const ROOM_IDS: Record<string, string> = { deluxe: "2", suite: "2" }
const ROOM_NAMES: Record<string, string> = {
  deluxe: "La Suite",
  suite: "La Suite",
}

const AVAILABLE_SERVICES = [
  { name: "Massaggio Rilassante Romano", price: 80 },
  { name: "Cena Romantica Imperiale", price: 120 },
  { name: "Tour Enogastronomico dei Castelli", price: 95 },
  { name: "Trattamento Viso alle Terme", price: 65 },
  { name: "Passeggiata a Cavallo", price: 75 },
  { name: "Corso di Cucina Romana", price: 85 },
  { name: "Tour Fotografico Roma Antica", price: 110 },
  { name: "Yoga al Tramonto", price: 45 },
]

export default function PrenotaPage() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  // ---- Prezzi / form ----
  const [roomPrices, setRoomPrices] = useState<Record<string, number>>({ deluxe: 120, suite: 180 })
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: "2", // Now represents adults only
    children: "0", // Added children field
    roomType: "suite", // Appartamento unico
    specialRequests: "",
  })

  // ---- Date range (unico comando) ----
  const [range, setRange] = useState<DateRange | undefined>(undefined)

  // ---- Invio richiesta / UI ----
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submittedBookingId, setSubmittedBookingId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<{ available: boolean; message: string } | null>(null)

  // Utils
  const toInputDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }
  const parseInputDate = (s: string) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? undefined : d
  }

  // ---- Fetch prezzi camere ----
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const rooms = await getAllRooms()
        const prices: Record<string, number> = {}
        rooms.forEach((room) => {
          if (room.id === "1") prices.deluxe = room.price
          if (room.id === "2") prices.suite = room.price
        })
        setRoomPrices((prev) => ({ ...prev, ...prices }))
      } catch (error) {
        console.error("[booking] Error fetching room prices:", error)
      }
    }
    fetchPrices()
  }, [])

  // ---- Sync calendar -> form ----
  useEffect(() => {
    if (range?.from) {
      setFormData((s) => ({ ...s, checkIn: toInputDate(range.from!) }))
    } else {
      setFormData((s) => ({ ...s, checkIn: "" }))
    }
    if (range?.to) {
      setFormData((s) => ({ ...s, checkOut: toInputDate(range.to!) }))
    } else {
      setFormData((s) => ({ ...s, checkOut: "" }))
    }
  }, [range])

  // ---- Sync form (input nascosti) -> calendar (se arrivano valori da QS/SSR) ----
  useEffect(() => {
    const from = parseInputDate(formData.checkIn)
    const to = parseInputDate(formData.checkOut)
    if (from && to) setRange({ from, to })
    else if (from && !to) setRange({ from, to: undefined })
  }, [formData.checkIn, formData.checkOut])

  // ---- Availability check ----
  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.checkIn && formData.checkOut && formData.roomType) {
        setIsCheckingAvailability(true)
        try {
          const roomId = ROOM_IDS[formData.roomType]
          // Cap the availability read so a hanging Firestore query can never leave
          // the form stuck in the "checking" state and keep the submit disabled.
          const isAvailable = await withTimeout(
            checkRoomAvailability(roomId, formData.checkIn, formData.checkOut),
            6000,
          )
          setAvailabilityStatus({
            available: isAvailable,
            message: isAvailable
              ? t("roomAvailable") || "Camera disponibile per le date selezionate."
              : t("roomNotAvailable") || "La camera non è disponibile per le date selezionate.",
          })
        } catch (error) {
          console.error("[booking] Error checking availability:", error)
          setAvailabilityStatus(null)
        } finally {
          setIsCheckingAvailability(false)
        }
      } else {
        setAvailabilityStatus(null)
      }
    }
    checkAvailability()
  }, [formData.checkIn, formData.checkOut, formData.roomType, t])

  // ---- Calculate dynamic price based on selected dates and room ----
  const { pricePerNight: dynamicPrice, loading: priceLoading } = useDynamicPrice(
    ROOM_IDS[formData.roomType] || "",
    formData.checkIn,
    formData.checkOut,
    Number(formData.guests || "2"),
  )

  // ---- Notti e totale ----
  const nights = useMemo(() => {
    const ci = formData.checkIn ? new Date(formData.checkIn) : null
    const co = formData.checkOut ? new Date(formData.checkOut) : null
    if (!ci || !co || isNaN(ci.getTime()) || isNaN(co.getTime())) return 0
    const diff = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [formData.checkIn, formData.checkOut])

  const basePrice = dynamicPrice || roomPrices[formData.roomType] || 0
  const adults = Number(formData.guests || "1")
  const children = 0
  const totalGuests = adults

  const total = nights * basePrice

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.checkIn || !formData.checkOut) {
      setErrorMessage(t("pleaseSelectDates") || "Seleziona le date di check-in e check-out.")
      setShowErrorModal(true)
      return
    }
    const checkInDate = new Date(formData.checkIn)
    const checkOutDate = new Date(formData.checkOut)
    if (checkOutDate <= checkInDate) {
      setErrorMessage(t("invalidDateRange") || "La data di check-out deve essere successiva al check-in.")
      setShowErrorModal(true)
      return
    }
    // Only block when availability is explicitly known to be unavailable.
    // A null status means the check hasn't run or failed (e.g. Firestore unreachable / rules),
    // and must NOT prevent sending a booking request that staff will confirm manually.
    if (availabilityStatus && availabilityStatus.available === false) {
      setErrorMessage(t("roomNotAvailableError") || "La camera selezionata non è disponibile in queste date.")
      setShowErrorModal(true)
      return
    }

    await submitBookingRequest()
  }

  const submitBookingRequest = async () => {
    setIsSubmitting(true)
    try {
      const bookingPayload: BookingPayload = {
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: adults,
        numberOfChildren: children,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        notes: formData.specialRequests,
        pricePerNight: basePrice,
        totalAmount: Math.round(total * 100),
        currency: "EUR",
        status: "pending",
        origin: "site",
        roomId: ROOM_IDS[formData.roomType],
        roomName: ROOM_NAMES[formData.roomType],
      }
      // The confirmation email is the essential deliverable. Try to persist the
      // booking to Firestore first, but never let a slow/failed write block the
      // email: on timeout or error we fall back to a locally generated code.
      let bookingId = ""
      try {
        bookingId = await withTimeout(createBooking(bookingPayload), 8000)
      } catch (bookingError) {
        console.error("[booking] Firestore save failed, sending email only:", bookingError)
        bookingId = generateFallbackBookingId()
      }

      const response = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          language,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guests: adults,
          children,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          specialRequests: formData.specialRequests,
          nights,
          pricePerNight: basePrice,
          subtotal: Math.round(total * 100),
          taxes: 0,
          serviceFee: 0,
          totalAmount: Math.round(total * 100),
          roomType: formData.roomType,
          roomId: ROOM_IDS[formData.roomType],
          roomName: ROOM_NAMES[formData.roomType],
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const requestCode = result.bookingId ? result.bookingId : bookingId
        throw new Error(`${t("bookingRequestSendFailure")} ${t("bookingRequestCode")}: ${requestCode}.`)
      }

      setSubmittedBookingId(bookingId)
      setShowSuccessModal(true)
    } catch (error) {
      console.error("[booking] Request error:", error)
      setErrorMessage(error instanceof Error ? error.message : t("bookingGenericError"))
      setShowErrorModal(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <>
      <main className="min-h-screen">
        <Header />

        <div className="pt-20 pb-16">
          <div className="container mx-auto px-4">
            {/* HERO */}
            <div
              ref={heroRef}
              className={`mb-8 text-center transition-all duration-1000 ${
                heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"
              }`}
            >
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-3 animate-text-shimmer">
                {t("bookingPageTitle") || "Prenota il Tuo Soggiorno"}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                {t("bookingPageSubtitle") || "Vivi un'esperienza indimenticabile nel cuore di Polignano a Mare"}
              </p>
            </div>

            {/* LAYOUT: Form (2col) + Info Cards (1col) */}
            <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
              {/* === FORM PRENOTAZIONE (2 colonne) === */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-cinzel text-primary">
                    {t("bookingDetailsTitle") || "Dettagli Prenotazione"}
                  </CardTitle>
                  <CardDescription>
                    {t("bookingDetailsSubtitle") || "Compila il modulo per prenotare il tuo soggiorno"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Date range - UN SOLO COMANDO */}
                  <div className="border rounded-lg p-4 bg-background/50">
                    <Label className="mb-2 block font-medium">{t("bookingDates") || "Date di soggiorno"}</Label>

                    <BookingCalendarPicker
                      value={range}
                      onChange={(next) => setRange(next)}
                      roomId={ROOM_IDS[formData.roomType] || "2"}
                    />

                    {/* hidden per submit/validazioni lato form */}
                    <input type="hidden" name="checkIn" value={formData.checkIn} />
                    <input type="hidden" name="checkOut" value={formData.checkOut} />

                    {/* Avvisi disponibilità */}
                    <div className="mt-3">
                      {isCheckingAvailability && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>{t("checkingAvailability") || "Verifica disponibilità…"}</AlertTitle>
                          <AlertDescription>{t("pleaseWait") || "Attendi qualche secondo."}</AlertDescription>
                        </Alert>
                      )}
                      {availabilityStatus && !isCheckingAvailability && (
                        <Alert variant={availabilityStatus.available ? "default" : "destructive"}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>
                            {availabilityStatus.available
                              ? t("roomAvailable") || "Camera disponibile"
                              : t("roomNotAvailable") || "Camera non disponibile"}
                          </AlertTitle>
                          <AlertDescription>
                            {availabilityStatus.available
                              ? t("roomAvailableDesc") || "Procedi con la prenotazione."
                              : t("roomNotAvailableDesc") || "Seleziona altre date o un'altra camera."}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>

                  {/* Dati ospite */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t("bookingFormFirstName") || "Nome"}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t("bookingFormLastName") || "Cognome"}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">{t("bookingFormEmail") || "Email"}</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t("bookingFormPhone") || "Telefono"}</Label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                    </div>
                  </div>

                  <button
  type="button"
  onClick={() =>
    setFormData((prev) => ({
      ...prev,
      roomType: "suite",
      guests: "2",
    }))
  }
  className={`w-full rounded-md border px-4 py-3 text-left transition-colors ${
    formData.roomType === "suite"
      ? "border-[#c9a84c] bg-[#c9a84c]/10"
      : "border-[#c9a84c]/40 bg-background hover:bg-[#c9a84c]/5"
  }`}
>
  <p className="font-semibold">{t("suiteSpaCapacity")}</p>
</button>

<input type="hidden" name="guests" value={formData.guests} />
<input type="hidden" name="roomType" value={formData.roomType} />
<input type="hidden" name="roomId" value={ROOM_IDS[formData.roomType] || ""} />
<input type="hidden" name="roomName" value={ROOM_NAMES[formData.roomType] || ""} />

                  <div>
                    <Label htmlFor="specialRequests">{t("bookingFormSpecialRequests") || "Richieste Speciali"}</Label>
                    <Textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleInputChange}
                      placeholder={t("bookingFormSpecialRequestsPlaceholder") || "Eventuali richieste particolari…"}
                      rows={3}
                    />
                  </div>

                  {/* Riepilogo totale */}
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                    <div className="text-sm text-muted-foreground">
                      {nights > 0
                        ? `${nights} ${
                            nights > 1 ? t("bookingNightsPlural") || "notti" : t("bookingNights") || "notte"
                          } • ${adults} ${adults > 1 ? t("adultPlural") : t("adultSingular")}${children > 0 ? ` + ${children} ${children > 1 ? t("childPlural") : t("childSingular")}` : ""}`
                        : t("bookingSummaryCompleteDates") || "Completa date e camera"}
                    </div>
                    <div className="text-xl font-semibold">
                      {t("bookingSummaryTotal") || "Totale"}: €{isFinite(total) ? total.toFixed(2) : "0.00"}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-lg py-6"
                    disabled={
                      isSubmitting ||
                      isCheckingAvailability ||
                      !formData.checkIn ||
                      !formData.checkOut ||
                      !formData.firstName.trim() ||
                      !formData.lastName.trim() ||
                      !formData.email.trim() ||
                      availabilityStatus?.available === false
                    }
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("bookingSending")}
                      </>
                    ) : (
                      t("bookingSubmitRequest")
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* === INFO CARDS (colonna destra) === */}
              <div className="space-y-4 lg:sticky lg:top-24 h-max">
                {/* Card 1 */}
                <Card className="h-full border-0 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-cinzel font-semibold text-primary mb-2">
                          {t("bookingCheckInOutTitle") || "Check-in / Check-out"}
                        </h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{t("bookingCheckIn") || "Check-in: 15:00 – 20:00"}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium">{t("bookingCheckOut") || "Check-out: 08:00 – 11:00"}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span>{t("maxTwoGuests")}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2 */}
                <Card className="h-full border-0 bg-gradient-to-br from-accent/5 via-secondary/10 to-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-cinzel font-semibold text-primary mb-2">
                          {t("bookingHowToReachTitle") || "Come Raggiungerci"}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{t("bookingAddressLine")}</p>
                          <p>{t("bookingAirportLine")}</p>
                          <p>{t("bookingStationLine")}</p>
                          <p>{t("bookingCenterLine")}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <Footer />

        {/* MODALE ERRORE */}
        <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("bookingErrorTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setShowErrorModal(false)}>
                {t("bookingErrorOkButton") || "Ok"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="mb-2 flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <AlertDialogTitle className="text-center">{t("bookingRequestSentTitle")}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-center">
                <span className="block">
                  {t("bookingRequestSentBeforeEmail")} <strong>{formData.email}</strong>. {t("bookingRequestSentAfterEmail")}
                </span>
                <span className="block font-medium text-foreground">{t("bookingNoPayment")}</span>
                {submittedBookingId && (
                  <span className="block text-xs">{t("bookingRequestCode")}: {submittedBookingId}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => router.push("/")}>{t("backHome")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
