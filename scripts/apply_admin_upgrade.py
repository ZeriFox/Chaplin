from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Replacement mismatch in {path}: expected 1 occurrence, found {count}\n--- OLD ---\n{old[:500]}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


def remove_file(path: str) -> None:
    target = Path(path)
    if target.exists():
        target.unlink()


# ---------------------------------------------------------------------------
# Admin dashboard: coupon tab + correct address
# ---------------------------------------------------------------------------
replace_once(
    "app/admin/page.tsx",
    'import { Calendar, BarChart3, Home, Settings, Users, Clock, Euro, Sparkles, TestTube, ContactRound } from "lucide-react"',
    'import { Calendar, BarChart3, Home, Settings, Users, Clock, Euro, Sparkles, TestTube, ContactRound, TicketPercent } from "lucide-react"',
)
replace_once(
    "app/admin/page.tsx",
    'import { AdminBookingActions, AdminBookingCreateButton } from "@/components/admin-booking-management"\n',
    'import { AdminBookingActions, AdminBookingCreateButton } from "@/components/admin-booking-management"\nimport { AdminCouponManagement } from "@/components/admin-coupon-management"\n',
)
replace_once(
    "app/admin/page.tsx",
    '            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto gap-1 p-1">',
    '            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 h-auto gap-1 p-1">',
)
replace_once(
    "app/admin/page.tsx",
    '''              <TabsTrigger value="pricing" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Euro className="h-4 w-4" />
                <span className="hidden sm:inline">Prezzi</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">''',
    '''              <TabsTrigger value="pricing" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Euro className="h-4 w-4" />
                <span className="hidden sm:inline">Prezzi</span>
              </TabsTrigger>
              <TabsTrigger value="coupons" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <TicketPercent className="h-4 w-4" />
                <span className="hidden sm:inline">Coupon</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">''',
)
replace_once(
    "app/admin/page.tsx",
    '''            <TabsContent value="pricing" className="space-y-4 sm:space-y-6">
              <DynamicPricingManagement />
            </TabsContent>

            <TabsContent value="services" className="space-y-4 sm:space-y-6">''',
    '''            <TabsContent value="pricing" className="space-y-4 sm:space-y-6">
              <DynamicPricingManagement />
            </TabsContent>

            <TabsContent value="coupons" className="space-y-4 sm:space-y-6">
              <AdminCouponManagement />
            </TabsContent>

            <TabsContent value="services" className="space-y-4 sm:space-y-6">''',
)
replace_once(
    "app/admin/page.tsx",
    '<Input className="mt-2 bg-muted/50 cursor-not-allowed" value="Vico Gelso I n 22" disabled />',
    '<Input className="mt-2 bg-muted/50 cursor-not-allowed" value="Via della Pettinara 48, 01100 Viterbo (VT)" disabled />',
)

# ---------------------------------------------------------------------------
# Booking payload type
# ---------------------------------------------------------------------------
replace_once(
    "lib/firebase.ts",
    '''  totalAmount?: number
  nights?: number''',
    '''  totalAmount?: number
  subtotalAmount?: number
  couponCode?: string
  discountAmount?: number
  nights?: number''',
)

# ---------------------------------------------------------------------------
# Booking form: coupon input and exact total
# ---------------------------------------------------------------------------
replace_once(
    "app/prenota/page.tsx",
    'import { CalendarIcon, Users, MapPin, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"',
    'import { CalendarIcon, Users, MapPin, Clock, AlertCircle, CheckCircle2, Loader2, Tag, X } from "lucide-react"',
)
replace_once(
    "app/prenota/page.tsx",
    '''  const [availabilityStatus, setAvailabilityStatus] = useState<{ available: boolean; message: string } | null>(null)

  // Utils''',
    '''  const [availabilityStatus, setAvailabilityStatus] = useState<{ available: boolean; message: string } | null>(null)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponMessage, setCouponMessage] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; finalTotal: number } | null>(null)

  // Utils''',
)
replace_once(
    "app/prenota/page.tsx",
    '''  const { pricePerNight: dynamicPrice, loading: priceLoading } = useDynamicPrice(
    ROOM_IDS[formData.roomType] || "",
    formData.checkIn,
    formData.checkOut,
    Number(formData.guests || "2"),
  )

  // ---- Notti e totale ----''',
    '''  const { pricePerNight: dynamicPrice, totalPrice: dynamicTotalPrice, loading: priceLoading } = useDynamicPrice(
    ROOM_IDS[formData.roomType] || "",
    formData.checkIn,
    formData.checkOut,
    Number(formData.guests || "2"),
  )

  useEffect(() => {
    setAppliedCoupon(null)
    setCouponMessage("")
  }, [formData.checkIn, formData.checkOut, formData.roomType])

  // ---- Notti e totale ----''',
)
replace_once(
    "app/prenota/page.tsx",
    '''  const total = nights * basePrice

  // ---- Submit ----''',
    '''  const subtotal = dynamicTotalPrice > 0 ? dynamicTotalPrice : nights * basePrice
  const couponDiscount = appliedCoupon?.discount || 0
  const total = Math.max(0, Math.round((subtotal - couponDiscount) * 100) / 100)

  const applyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase()
    if (!normalizedCode) {
      setAppliedCoupon(null)
      setCouponMessage("Inserisci un codice coupon")
      return
    }
    if (!formData.checkIn || !formData.checkOut || subtotal <= 0) {
      setCouponMessage("Seleziona prima le date del soggiorno")
      return
    }

    setCouponLoading(true)
    setCouponMessage("")
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ code: normalizedCode, subtotal, checkIn: formData.checkIn }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Coupon non valido")
      setCouponCode(data.code)
      setAppliedCoupon({ code: data.code, discount: Number(data.discount || 0), finalTotal: Number(data.finalTotal || 0) })
      setCouponMessage(`Coupon ${data.code} applicato: risparmi €${Number(data.discount || 0).toFixed(2)}`)
    } catch (error) {
      setAppliedCoupon(null)
      setCouponMessage(error instanceof Error ? error.message : "Coupon non valido")
    } finally {
      setCouponLoading(false)
    }
  }

  // ---- Submit ----''',
)
replace_once(
    "app/prenota/page.tsx",
    '''        pricePerNight: basePrice,
        totalAmount: Math.round(total * 100),
        currency: "EUR",''',
    '''        pricePerNight: basePrice,
        subtotalAmount: Math.round(subtotal * 100),
        couponCode: appliedCoupon?.code,
        discountAmount: Math.round(couponDiscount * 100),
        totalAmount: Math.round(total * 100),
        currency: "EUR",''',
)
replace_once(
    "app/prenota/page.tsx",
    '''          pricePerNight: basePrice,
          subtotal: Math.round(total * 100),
          taxes: 0,
          serviceFee: 0,
          totalAmount: Math.round(total * 100),''',
    '''          pricePerNight: basePrice,
          subtotal: Math.round(subtotal * 100),
          couponCode: appliedCoupon?.code || "",
          discountAmount: Math.round(couponDiscount * 100),
          taxes: 0,
          serviceFee: 0,
          totalAmount: Math.round(total * 100),''',
)
replace_once(
    "app/prenota/page.tsx",
    '''                  {/* Riepilogo totale */}
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
                  </div>''',
    '''                  <div className="rounded-lg border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-4">
                    <Label htmlFor="booking-coupon" className="flex items-center gap-2 font-medium">
                      <Tag className="h-4 w-4 text-[#b28b2e]" /> Coupon sconto
                    </Label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="booking-coupon"
                        value={couponCode}
                        onChange={(event) => {
                          setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                          setAppliedCoupon(null)
                          setCouponMessage("")
                        }}
                        placeholder="Inserisci il codice"
                        disabled={couponLoading || priceLoading}
                      />
                      <Button type="button" variant="outline" onClick={applyCoupon} disabled={couponLoading || priceLoading || subtotal <= 0}>
                        {couponLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Tag className="mr-2 h-4 w-4" />}
                        Applica
                      </Button>
                      {appliedCoupon && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => { setAppliedCoupon(null); setCouponCode(""); setCouponMessage("") }} aria-label="Rimuovi coupon">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {couponMessage && <p className={`mt-2 text-sm ${appliedCoupon ? "text-green-700" : "text-red-600"}`}>{couponMessage}</p>}
                  </div>

                  {/* Riepilogo totale */}
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        {nights > 0
                          ? `${nights} ${nights > 1 ? t("bookingNightsPlural") || "notti" : t("bookingNights") || "notte"} • ${adults} ${adults > 1 ? t("adultPlural") : t("adultSingular")}`
                          : t("bookingSummaryCompleteDates") || "Completa date e camera"}
                      </div>
                      <div className="min-w-56 space-y-1 text-sm">
                        <div className="flex justify-between gap-5"><span>Subtotale</span><span>€{isFinite(subtotal) ? subtotal.toFixed(2) : "0.00"}</span></div>
                        {appliedCoupon && <div className="flex justify-between gap-5 text-green-700"><span>Coupon {appliedCoupon.code}</span><span>-€{couponDiscount.toFixed(2)}</span></div>}
                        <div className="flex justify-between gap-5 border-t pt-1 text-xl font-semibold"><span>{t("bookingSummaryTotal") || "Totale"}</span><span>€{isFinite(total) ? total.toFixed(2) : "0.00"}</span></div>
                      </div>
                    </div>
                  </div>''',
)

# ---------------------------------------------------------------------------
# Server-side authoritative booking price + coupon claim
# ---------------------------------------------------------------------------
replace_once(
    "app/api/bookings/request/route.ts",
    'import { getAdminDb } from "@/lib/firebase-admin"\n',
    'import { getAdminDb } from "@/lib/firebase-admin"\nimport { calculateBookingPrice } from "@/lib/pricing-engine"\nimport { claimCouponForBooking, CouponError } from "@/lib/coupons"\n',
)
replace_once(
    "app/api/bookings/request/route.ts",
    'const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chaplin-two.vercel.app")',
    'const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://chaplinluxuryholidayhouse.it")',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''  totalAmount?: number
  specialRequests?: string''',
    '''  totalAmount?: number
  couponCode?: string
  discountAmount?: number
  specialRequests?: string''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''    const pricePerNight = Math.max(0, Math.round(Number(body.pricePerNight) || 0))
    const subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0))
    const taxes = Math.max(0, Math.round(Number(body.taxes) || 0))
    const serviceFee = Math.max(0, Math.round(Number(body.serviceFee) || 0))
    const totalAmount = Math.max(0, Math.round(Number(body.totalAmount) || 0))''',
    '''    let pricePerNight = Math.max(0, Number(body.pricePerNight) || 0)
    let subtotal = Math.max(0, Math.round(Number(body.subtotal) || 0))
    let taxes = Math.max(0, Math.round(Number(body.taxes) || 0))
    let serviceFee = Math.max(0, Math.round(Number(body.serviceFee) || 0))
    let totalAmount = Math.max(0, Math.round(Number(body.totalAmount) || 0))
    const requestedCouponCode = cleanText(body.couponCode, 40).toUpperCase()''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''    if (!bookingDocumentId) {
      return NextResponse.json({ error: "Codice richiesta non valido" }, { status: 400 })
    }

    let bookingRef: DocumentReference | null = null''',
    '''    if (!bookingDocumentId) {
      return NextResponse.json({ error: "Codice richiesta non valido" }, { status: 400 })
    }

    const authoritativePrice = await calculateBookingPrice({ roomId, checkIn, checkOut })
    pricePerNight = authoritativePrice.pricePerNight
    subtotal = Math.round(authoritativePrice.totalPrice * 100)
    taxes = 0
    serviceFee = 0
    totalAmount = subtotal

    let couponCode = ""
    let discountAmount = 0
    if (requestedCouponCode) {
      const claimedCoupon = await claimCouponForBooking({
        code: requestedCouponCode,
        subtotal: subtotal / 100,
        checkIn,
        bookingId: bookingDocumentId,
      })
      couponCode = claimedCoupon.code
      discountAmount = Math.round(claimedCoupon.discount * 100)
      totalAmount = Math.round(claimedCoupon.finalTotal * 100)
    }

    let bookingRef: DocumentReference | null = null''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''      subtotal,
      taxes,
      serviceFee,
      total: totalAmount,''',
    '''      subtotal,
      subtotalBeforeDiscount: subtotal,
      couponCode: couponCode || null,
      discountAmount,
      taxes,
      serviceFee,
      total: totalAmount,''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''    const customerTotal = formatMoney(totalAmount, customerCopy.locale)
    const structureCheckIn = formatDate(checkIn)
    const structureCheckOut = formatDate(checkOut)
    const structureTotal = formatMoney(totalAmount)''',
    '''    const customerSubtotal = formatMoney(subtotal, customerCopy.locale)
    const customerDiscount = formatMoney(discountAmount, customerCopy.locale)
    const customerTotal = formatMoney(totalAmount, customerCopy.locale)
    const structureCheckIn = formatDate(checkIn)
    const structureCheckOut = formatDate(checkOut)
    const structureSubtotal = formatMoney(subtotal)
    const structureDiscount = formatMoney(discountAmount)
    const structureTotal = formatMoney(totalAmount)
    const safeCouponCode = escapeHtml(couponCode)''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.guests}</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.total}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${customerTotal}</td></tr>''',
    '''      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.guests}</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      ${couponCode ? `<tr><td style="padding:8px 0;font-weight:600">Subtotale</td><td style="padding:8px 0;text-align:right">${customerSubtotal}</td></tr><tr><td style="padding:8px 0;font-weight:600">Coupon ${safeCouponCode}</td><td style="padding:8px 0;text-align:right;color:#238636">-${customerDiscount}</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-weight:600">${customerCopy.labels.total}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${customerTotal}</td></tr>''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''      <tr><td style="padding:8px 0;font-weight:600">Ospiti</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Totale indicativo</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${structureTotal}</td></tr>''',
    '''      <tr><td style="padding:8px 0;font-weight:600">Ospiti</td><td style="padding:8px 0;text-align:right">${guests}</td></tr>
      ${couponCode ? `<tr><td style="padding:8px 0;font-weight:600">Subtotale</td><td style="padding:8px 0;text-align:right">${structureSubtotal}</td></tr><tr><td style="padding:8px 0;font-weight:600">Coupon ${safeCouponCode}</td><td style="padding:8px 0;text-align:right;color:#238636">-${structureDiscount}</td></tr>` : ""}
      <tr><td style="padding:8px 0;font-weight:600">Totale indicativo</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#b28b2e">${structureTotal}</td></tr>''',
)
replace_once(
    "app/api/bookings/request/route.ts",
    '''  } catch (error) {
    console.error("[Booking Request] Unexpected error:", error)
    return NextResponse.json({ error: "Impossibile registrare la richiesta di prenotazione" }, { status: 500 })
  }''',
    '''  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[Booking Request] Unexpected error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile registrare la richiesta di prenotazione" }, { status: 500 })
  }''',
)

# ---------------------------------------------------------------------------
# Remove obsolete insecure OTP routes and temporary placeholders
# ---------------------------------------------------------------------------
for obsolete in [
    "app/api/admin/send-otp-email/route.ts",
    "app/api/admin/send-otp-password/route.ts",
    "app/api/admin/send-otp-phone/route.ts",
    "app/api/admin/update-email/route.ts",
    "app/api/admin/update-password/route.ts",
    "app/api/admin/update-phone/route.ts",
    "scripts/.admin-upgrade-files.00",
    "scripts/.admin-upgrade-files.01",
    "scripts/.admin-upgrade-files.02",
]:
    remove_file(obsolete)

# The workflow and this one-time patcher must not remain in the product branch.
remove_file(".github/workflows/apply-admin-upgrade.yml")
remove_file("scripts/apply_admin_upgrade.py")
