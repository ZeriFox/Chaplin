"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Users, Mail, Phone, CreditCard, FileText, ArrowLeft, Copy, Check, XCircle } from "lucide-react"
import { getBookingById } from "@/lib/firebase"
import { useLanguage } from "@/components/language-provider"
import Image from "next/image"
import { ServicesRequestCard } from "@/components/services-request-card"
import { ChangeDatesDialog } from "@/components/change-dates-dialog"
import { CancelBookingDialog } from "@/components/cancel-booking-dialog"
import { toast } from "sonner"

console.log("[v0 MODULE] ==========================================")
console.log("[v0 MODULE] page.tsx module loaded at:", new Date().toISOString())
console.log("[v0 MODULE] ==========================================")

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  console.log("[v0 RENDER] Component rendering at:", new Date().toISOString())
  console.log("[v0 RENDER] URL:", typeof window !== "undefined" ? window.location.href : "SSR")
  console.log("[v0 RENDER] searchParams:", searchParams?.toString())

  const paymentParam = searchParams?.get("payment")
  const sessionIdParam = searchParams?.get("session_id")

  console.log("[v0 RENDER] payment:", paymentParam)
  console.log("[v0 RENDER] session_id:", sessionIdParam)

  if (typeof window !== "undefined" && paymentParam) {
    console.log("[v0 RENDER] 🎯 PAYMENT PARAMS DETECTED IN RENDER!")
    console.log("[v0 RENDER] Will process in useEffect...")
  }

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [changeDatesOpen, setChangeDatesOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const loadBooking = async () => {
    if (!params.id) return
    const data = await getBookingById(params.id as string)
    setBooking(data)
    setLoading(false)
  }

  useEffect(() => {
    console.log("[v0 EFFECT] ==========================================")
    console.log("[v0 EFFECT] useEffect TRIGGERED!")
    console.log("[v0 EFFECT] Timestamp:", new Date().toISOString())
    console.log("[v0 EFFECT] ==========================================")

    const processPayment = async () => {
      const payment = searchParams?.get("payment")
      const sessionId = searchParams?.get("session_id")

      console.log("[v0 EFFECT] Payment status:", payment)
      console.log("[v0 EFFECT] Session ID:", sessionId)

      if (payment === "processing") {
        console.log("[v0 EFFECT] 💳 Payment completed - polling for webhook updates...")

        toast.info(t("paymentCompleted"), {
          description: t("updatingBooking"),
          duration: 15000,
        })

        let pollCount = 0
        const maxPolls = 10
        const originalTotal = booking?.totalAmount || 0

        // Poll for booking updates every 2 seconds
        const pollInterval = setInterval(async () => {
          pollCount++
          console.log(`[v0 EFFECT] Polling attempt ${pollCount}/${maxPolls} for booking updates...`)

          await loadBooking()

          // Check if booking was updated (totalAmount changed)
          const updatedBooking = await getBookingById(params.id as string)
          if (updatedBooking && updatedBooking.totalAmount !== originalTotal) {
            console.log("[v0 EFFECT] ✅ Booking updated by webhook!")
            clearInterval(pollInterval)
            toast.success(t("bookingUpdated"), {
              description: t("changesApplied"),
            })
            router.replace(`/user/booking/${params.id}`)
            return
          }

          if (pollCount >= maxPolls) {
            console.log("[v0 EFFECT] Max polling attempts reached")
            clearInterval(pollInterval)
            toast.success(t("paymentReceived"), {
              description: t("bookingWillUpdate"),
            })
            router.replace(`/user/booking/${params.id}`)
          }
        }, 2000)

        // Cleanup after 20 seconds
        setTimeout(() => {
          clearInterval(pollInterval)
          router.replace(`/user/booking/${params.id}`)
        }, 20000)

        return
      }

      if (payment === "success" && sessionId) {
        console.log("[v0 EFFECT] ✅ Legacy success handler - redirecting to processing...")
        router.replace(`/user/booking/${params.id}?payment=processing`)
        return
      }

      if (payment === "cancelled") {
        console.log("[v0 EFFECT] ❌ Payment cancelled by user")
        toast.error(t("paymentCancelled"), {
          description: t("tryAgainLater"),
        })
        router.replace(`/user/booking/${params.id}`)
      }
    }

    processPayment()
  }, [searchParams, params.id, router, booking?.totalAmount])

  useEffect(() => {
    console.log("[v0 EFFECT] Loading booking data for ID:", params.id)
    loadBooking()
  }, [params.id])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatPrice = (price: number) => {
    return typeof price === "number" ? price.toFixed(2) : "0.00"
  }

  const getRoomImage = (roomName: string) => {
    if (!roomName) {
      return "/images/room-1.jpg"
    }
    if (roomName.toLowerCase().includes("familiare") || roomName.toLowerCase().includes("balcone")) {
      return "/images/room-2.jpg"
    }
    return "/images/room-1.jpg"
  }

  const CONTACT_PHONE = "+39 375 701 7689"
  const CONTACT_EMAIL = "info@AL22Suite&SPALUXURYEXPERIENCE.it"

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-16 text-center">
          <p className="text-muted-foreground">{t("bookingNotFound")}</p>
          <Button onClick={() => router.push("/user")} className="mt-4">
            {t("backToProfile")}
          </Button>
        </div>
        <Footer />
      </main>
    )
  }

  const isCancelled = booking.status === "cancelled"
  const isCompleted = new Date(booking.checkOut) <= new Date() || booking.status === "completed"
  const canModify = !isCancelled && !isCompleted

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Button variant="ghost" onClick={() => router.push("/user")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToProfile")}
          </Button>

          <div className="mb-6">
            <Badge
              variant={
                isCancelled
                  ? "destructive"
                  : booking.status === "confirmed" || booking.status === "paid"
                    ? "default"
                    : "secondary"
              }
              className="text-lg px-4 py-2"
            >
              {isCancelled
                ? `❌ ${t("cancelled")}`
                : booking.status === "confirmed" || booking.status === "paid"
                  ? `✓ ${booking.status === "paid" ? t("paid") : t("confirmed")}`
                  : t("pending")}
            </Badge>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Room Image and Info */}
              <Card>
                <CardContent className="p-0">
                  <div className="relative h-64 w-full">
                    <Image
                      src={getRoomImage(booking.roomName) || "/placeholder.svg"}
                      alt={booking.roomName}
                      fill
                      className={`object-cover rounded-t-lg ${isCancelled ? "grayscale" : ""}`}
                    />
                    {isCancelled && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-lg">
                        <div className="text-white text-center">
                          <p className="text-3xl font-bold mb-2">❌</p>
                          <p className="text-xl font-semibold">{t("bookingCancelled")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h1 className="text-3xl font-cinzel font-bold text-roman-gradient mb-2">{booking.roomName}</h1>
                    <p className="text-muted-foreground mb-4">AL 22 Suite & Spa - Polignano a Mare</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-semibold">
                        {t("guest")}: {booking.firstName} {booking.lastName}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t("bookingDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Confirmation Number */}
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t("confirmationNumber")}</p>
                        <p className="text-2xl font-bold">{booking.id.slice(0, 12).toUpperCase()}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(booking.id, "confirmation")}>
                        {copiedField === "confirmation" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Dates */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="font-semibold">
                          {new Date(booking.checkIn).toLocaleDateString("it-IT", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">{t("from15")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-out</p>
                        <p className="font-semibold">
                          {new Date(booking.checkOut).toLocaleDateString("it-IT", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">{t("until10")}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Guest Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("guests")}</p>
                        <p className="font-semibold">
                          {booking.guests} {booking.guests === 1 ? t("person") : t("people")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">{t("email")}</p>
                        <p className="font-semibold">{booking.email}</p>
                      </div>
                    </div>
                    {booking.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">{t("phone")}</p>
                          <p className="font-semibold">{booking.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">{t("specialRequests")}</p>
                        <p className="text-sm bg-secondary/50 rounded-lg p-3">{booking.notes}</p>
                      </div>
                    </>
                  )}

                  {isCancelled && booking.cancelledAt && (
                    <>
                      <Separator />
                      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-destructive text-2xl">❌</div>
                          <div className="flex-1">
                            <p className="font-semibold text-destructive mb-2">{t("bookingCancelled")}</p>
                            <p className="text-sm text-muted-foreground mb-3">
                              {t("cancelledOn")}{" "}
                              {new Date(booking.cancelledAt).toLocaleDateString("it-IT", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t("originalCost")}</span>
                                <span className="font-semibold line-through">€{formatPrice(booking.totalAmount)}</span>
                              </div>

                              {booking.penalty !== undefined && booking.penalty > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-destructive">{t("cancellationPenalty")}</span>
                                  <span className="font-semibold text-destructive">
                                    -€{formatPrice(booking.penalty)}
                                  </span>
                                </div>
                              )}

                              {booking.refundAmount !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t("refundAmount")}</span>
                                  <span className="font-bold text-xl text-green-600">
                                    €{formatPrice(booking.refundAmount)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-3">{t("refundProcessing")}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("paymentInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isCancelled ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("originalCost")}</span>
                        <span className="font-bold text-xl line-through text-muted-foreground">
                          €{formatPrice(booking.totalAmount)}
                        </span>
                      </div>
                      {booking.penalty !== undefined && booking.penalty > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("cancellationPenalty")}</span>
                          <span className="font-semibold text-destructive">€{formatPrice(booking.penalty)}</span>
                        </div>
                      )}
                      {booking.refundAmount !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("refundAmount")}</span>
                          <span className="font-bold text-xl text-green-600">€{formatPrice(booking.refundAmount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-1">💳 {t("refund")}</p>
                        <p className="text-muted-foreground">{t("refundProcessing")}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("totalCost")}</span>
                        <span className="font-bold text-xl">€{formatPrice(booking.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("totalPaid")}</span>
                        <span className="font-semibold text-green-600">
                          €{formatPrice(booking.totalPaid || booking.totalAmount)}
                        </span>
                      </div>
                      {booking.totalPaid && booking.totalPaid < booking.totalAmount && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("remaining")}</span>
                          <span className="font-semibold text-orange-600">
                            €{formatPrice(booking.totalAmount - booking.totalPaid)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-1">💳 {t("onlinePayment")}</p>
                        <p className="text-muted-foreground">{t("fullPaymentMade")}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {canModify && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-cinzel text-primary">{t("manageBooking")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      onClick={() => setChangeDatesOpen(true)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("changeDates")}
                    </Button>
                    <Button variant="destructive" className="w-full justify-start" onClick={() => setCancelOpen(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      {t("cancelBooking")}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-cinzel text-primary">{t("contactProperty")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <a href={`tel:${CONTACT_PHONE}`} className="hover:text-primary transition-colors">
                      {CONTACT_PHONE}
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => window.open(`https://wa.me/${CONTACT_PHONE.replace(/\s/g, "")}`, "_blank")}
                  >
                    {t("sendMessage")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => (window.location.href = `mailto:${CONTACT_EMAIL}`)}
                  >
                    {t("sendEmail")}
                  </Button>
                </CardContent>
              </Card>

              {canModify && <ServicesRequestCard bookingId={booking.id} />}
            </div>
          </div>
        </div>
      </div>

      {canModify && (
        <>
          <ChangeDatesDialog
            open={changeDatesOpen}
            onOpenChange={setChangeDatesOpen}
            bookingId={booking.id}
            currentCheckIn={booking.checkIn}
            currentCheckOut={booking.checkOut}
            onSuccess={loadBooking}
          />

          <CancelBookingDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            bookingId={booking.id}
            checkIn={booking.checkIn}
            totalAmount={booking.totalAmount}
            onSuccess={() => router.push("/user")}
          />
        </>
      )}

      <Footer />
    </main>
  )
}
