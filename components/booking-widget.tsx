"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Users, AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useRoomPrices } from "@/hooks/use-room-prices"
import { checkRoomAvailability } from "@/lib/booking-utils"
import { BookingModal } from "@/components/booking-modal"
import type { DateRange } from "@/components/date-range-picker"
import { useDynamicPrice } from "@/hooks/use-dynamic-price"
import { BookingCalendarPicker } from "@/components/booking-calendar-picker"

interface BookingWidgetProps {
  roomId: string
}

export function BookingWidget({ roomId }: BookingWidgetProps) {
  const { t } = useLanguage()
  const { prices } = useRoomPrices()

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [guests, setGuests] = useState(2)
  const [selectedRoomType, setSelectedRoomType] = useState(roomId)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<{ available: boolean; message: string } | null>(null)

  const toInputDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  const { pricePerNight: dynamicPrice, loading: priceLoading } = useDynamicPrice(
    selectedRoomType,
    dateRange?.from ? toInputDate(dateRange.from) : "",
    dateRange?.to ? toInputDate(dateRange.to) : "",
    guests,
  )

  const basePrice = dynamicPrice || prices[selectedRoomType] || 180
  const originalPrice = selectedRoomType === "1" ? 220 : 180
  const discount = originalPrice - basePrice

  const checkIn = dateRange?.from ? toInputDate(dateRange.from) : ""
  const checkOut = dateRange?.to ? toInputDate(dateRange.to) : ""

  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0
    const ms = dateRange.to.getTime() - dateRange.from.getTime()
    const diff = Math.ceil(ms / (1000 * 60 * 60 * 24))
    return isFinite(diff) && diff > 0 ? diff : 0
  }, [dateRange])

  const subtotal = basePrice * (nights || 0)
  const touristTax = nights * guests * 2.8
  const total = subtotal + touristTax

  useEffect(() => {
    const checkAvailability = async () => {
      if (checkIn && checkOut && selectedRoomType) {
        setIsCheckingAvailability(true)
        try {
          const isAvailable = await checkRoomAvailability(selectedRoomType, checkIn, checkOut)
          setAvailabilityStatus({
            available: isAvailable,
            message: isAvailable
              ? t("roomAvailable") || "Camera disponibile per le date selezionate."
              : t("roomNotAvailable") || "La camera non è disponibile per le date selezionate.",
          })
        } catch (error) {
          console.error("[booking-widget] Error checking availability:", error)
          setAvailabilityStatus(null)
        } finally {
          setIsCheckingAvailability(false)
        }
      } else {
        setAvailabilityStatus(null)
      }
    }
    checkAvailability()
  }, [checkIn, checkOut, selectedRoomType, t])

  const handleBooking = () => {
    setIsModalOpen(true)
  }

  const formatMoney = (n: number) => `€${Intl.NumberFormat("it-IT", { minimumFractionDigits: 0 }).format(n)}`

  return (
    <>
      <div className="space-y-6">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("bookNow")}</span>
              <div className="text-right">
                {originalPrice > basePrice && (
                  <div className="text-sm line-through text-muted-foreground">
                    {formatMoney(originalPrice)}/{t("night")}
                  </div>
                )}
                <div className="text-2xl font-bold text-primary">
                  {formatMoney(basePrice)}
                  <span className="text-sm font-normal text-muted-foreground">/{t("night")}</span>
                </div>
              </div>
            </CardTitle>

            {originalPrice > basePrice && (
              <Badge className="w-fit bg-[#c9a84c] text-[#1a1a1a]">
                {t("save")} {formatMoney(discount)}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label>{t("bookingDates") || "Date di soggiorno"}</Label>
              <BookingCalendarPicker
                value={dateRange}
                onChange={setDateRange}
                roomId={selectedRoomType}
                className="mt-1"
                compact={true}
              />
            </div>

            <div>
              <Label htmlFor="widget-guests">{t("guests")}</Label>
              <div className="relative">
                <Input
                  id="widget-guests"
                  type="number"
                  min="1"
                  max="2"
                  value={guests}
                  onChange={(e) => setGuests(Math.min(2, Math.max(1, Number.parseInt(e.target.value || "1"))))}
                  className="pl-10"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <Label htmlFor="widget-nights">{t("nights")}</Label>
              <Input id="widget-nights" value={nights || ""} readOnly placeholder="—" />
              <p className="mt-1 text-xs text-muted-foreground">{t("nightsCalculated")}</p>
            </div>

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
                <AlertDescription>{availabilityStatus.message}</AlertDescription>
              </Alert>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>
                  {formatMoney(basePrice)} × {nights || 0} {t("nights")}
                </span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t("touristTax") || "Tassa di soggiorno"}</span>
                <span>{formatMoney(touristTax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t("total")}</span>
                <span className="text-primary">{formatMoney(total)}</span>
              </div>
            </div>

            <Button
              onClick={handleBooking}
              className="w-full"
              size="lg"
              disabled={
                !availabilityStatus?.available || isCheckingAvailability || !checkIn || !checkOut || nights <= 0
              }
            >
              {t("bookNow")}
            </Button>

            <p className="text-xs text-muted-foreground text-center">{t("noChargeYet")}</p>
          </CardContent>
        </Card>
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingData={{
          checkIn,
          checkOut,
          guests,
          nights,
          roomId: selectedRoomType,
          subtotal,
          touristTax,
          serviceFee: 0,
          total,
        }}
      />
    </>
  )
}
