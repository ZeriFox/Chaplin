"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExtraServicesModal } from "@/components/extra-services-modal"
import {
  getBookingById,
  createStripeCheckout,
  createNexiCheckout,
  createUserFromBooking,
  linkBookingToUser,
  updateBooking,
} from "@/lib/firebase"
import { Loader2, AlertCircle, CreditCard } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export default function CheckoutPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const search = useSearchParams()
  const bookingId = search.get("bookingId") || ""
  const methodFromQuery = search.get("method") as "stripe" | "nexi" | null

  const [booking, setBooking] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "nexi">(methodFromQuery || "stripe")
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string>("")
  const [successUrl, setSuccessUrl] = useState("")
  const [cancelUrl, setCancelUrl] = useState("")
  const [showServicesModal, setShowServicesModal] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSuccessUrl(`${window.location.origin}/checkout/success?bookingId=${bookingId}`)
      setCancelUrl(`${window.location.origin}/prenota?error=payment_failed`)
    }
  }, [bookingId])

  useEffect(() => {
    if (!bookingId) return
    ;(async () => {
      setLoading(true)
      const data = await getBookingById(bookingId)
      setBooking(data)
      setLoading(false)
    })()
  }, [bookingId])

  const totalEUR = useMemo(() => {
    const cents = Number(booking?.totalAmount || 0)
    return (cents / 100).toFixed(2)
  }, [booking])

  const handlePay = async () => {
    setShowServicesModal(true)
  }

  const handleCompleteServicesSelection = async () => {
    if (!bookingId || !booking || !successUrl || !cancelUrl) return
    setPaying(true)
    setError("")
    try {
      console.log("[v0] Checking if user exists for email:", booking.email)
      const userResult = await createUserFromBooking(booking.email, booking.firstName, booking.lastName)

      if (userResult.success && userResult.password) {
        console.log("[v0] New user created, saving password to booking")
        await updateBooking(bookingId, {
          newUserPassword: userResult.password,
        })

        await linkBookingToUser(bookingId, booking.email)
        console.log("[v0] Booking linked to user")
      } else if (userResult.success) {
        console.log("[v0] User already exists, linking booking")
        await linkBookingToUser(bookingId, booking.email)
      } else {
        console.error("[v0] Failed to create user:", userResult.error)
      }

      // Update booking with chosen payment provider
      await updateBooking(bookingId, { paymentProvider: paymentMethod })

      if (paymentMethod === "nexi") {
        const res = await createNexiCheckout({
          bookingId,
          amount: booking.totalAmount,
          currency: booking.currency || "EUR",
          successUrl,
          cancelUrl,
          customerEmail: booking.email,
          metadata: { source: "site" },
        })
        window.location.href = res.url
      } else {
        const res = await createStripeCheckout({
          bookingId,
          amount: booking.totalAmount,
          currency: booking.currency || "EUR",
          successUrl,
          cancelUrl,
          customerEmail: booking.email,
          metadata: { source: "site" },
        })
        window.location.href = res.url
      }
    } catch (e: any) {
      console.error(e)
      if (e.message?.includes("Invalid API Key") || e.message?.includes("authentication")) {
        setError("Errore di configurazione del pagamento. Contatta l'amministratore del sito.")
      } else {
        setError("Si è verificato un errore durante l'elaborazione del pagamento. Riprova più tardi.")
      }
      setPaying(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>{t("bookingSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="animate-spin h-4 w-4" /> {t("loading")}
              </div>
            ) : !booking ? (
              <div className="text-sm text-muted-foreground">{t("bookingNotFound")}</div>
            ) : (
              <div className="space-y-3">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("name")}</div>
                    <div className="font-medium">
                      {booking.firstName} {booking.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("email")}</div>
                    <div className="font-medium">{booking.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("checkIn")}</div>
                    <div className="font-medium">{booking.checkIn}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("checkOut")}</div>
                    <div className="font-medium">{booking.checkOut}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("guests")}</div>
                    <div className="font-medium">{booking.guests}</div>
                  </div>
                </div>

                {booking.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground">{t("requests")}</div>
                    <div className="text-sm">{booking.notes}</div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-3">
                  <div className="text-sm text-muted-foreground">{t("total")}</div>
                  <div className="text-xl font-semibold">€{totalEUR}</div>
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("selectPaymentMethod") || "Scegli il metodo di pagamento"}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Stripe Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("stripe")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === "stripe"
                          ? "border-[#635BFF] bg-[#635BFF]/5"
                          : "border-border hover:border-[#635BFF]/50"
                      }`}
                    >
                      <svg width="50" height="20" viewBox="0 0 60 25" fill="none" aria-hidden="true">
                        <path
                          d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"
                          fill="#635BFF"
                        />
                      </svg>
                      <span className="text-xs text-muted-foreground">Carte, PayPal, Klarna</span>
                    </button>

                    {/* Nexi Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("nexi")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === "nexi"
                          ? "border-[#1a1f71] bg-[#1a1f71]/5"
                          : "border-border hover:border-[#1a1f71]/50"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-5 h-5 text-[#1a1f71]" />
                        <span className="text-lg font-bold text-[#1a1f71]">nexi</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Carte, Bancomat, PagoBancomat</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={handlePay} disabled={paying} className="w-full py-6 text-lg">
                    {paying ? t("redirecting") : `${t("payNow")} - €${totalEUR}`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExtraServicesModal
        open={showServicesModal}
        onOpenChange={setShowServicesModal}
        onComplete={handleCompleteServicesSelection}
        bookingData={{
          roomId: booking?.roomId || "",
          checkIn: booking?.checkIn || "",
          checkOut: booking?.checkOut || "",
          guests: booking?.guests || 1,
          userEmail: booking?.email || "",
          userName: `${booking?.firstName || ""} ${booking?.lastName || ""}`.trim(),
        }}
      />

      <Footer />
    </main>
  )
}
