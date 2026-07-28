"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Loader2, AlertTriangle } from "lucide-react"
import { calculateDaysUntilCheckIn } from "@/lib/pricing"
import { BookingCalendarPicker, type DateRange } from "@/components/booking-calendar-picker"
import { useLanguage } from "@/components/language-provider"

interface ChangeDatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  currentCheckIn: string
  currentCheckOut: string
  onSuccess: () => void
}

export function ChangeDatesDialog({
  open,
  onOpenChange,
  bookingId,
  currentCheckIn,
  currentCheckOut,
  onSuccess,
}: ChangeDatesDialogProps) {
  const { t } = useLanguage()
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(currentCheckIn),
    to: new Date(currentCheckOut),
  })
  const [loading, setLoading] = useState(false)
  const [priceData, setPriceData] = useState<any>(null)
  const [bookingData, setBookingData] = useState<any>(null)

  const daysUntilCheckIn = calculateDaysUntilCheckIn(currentCheckIn)
  const isWithinSevenDays = daysUntilCheckIn <= 7

  // Load booking data
  useEffect(() => {
    if (open) {
      loadBookingData()
    }
  }, [open, bookingId])

  const loadBookingData = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setBookingData(data)
    } catch (error: any) {
      console.error("[v0] Error loading booking:", error)
      toast.error(t("errorLoadingBooking"))
    }
  }

  const handleCalculatePrice = async () => {
    if (!range?.from || !range?.to) {
      toast.error(t("selectBothDates"))
      return
    }

    setLoading(true)
    try {
      const checkIn = range.from.toISOString().split("T")[0]
      const checkOut = range.to.toISOString().split("T")[0]

      const response = await fetch("/api/bookings/change-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn,
          checkOut,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.details)

      // If payment is required, the API returns payment info
      if (data.paymentRequired) {
        setPriceData(data)
        toast.success(t("priceCalculatedSuccess"))
      } else {
        // No payment needed (price decreased or same)
        toast.success(data.message || t("datesChangedSuccess"))
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message || t("errorCalculatingPrice"))
      console.error("[v0] Error calculating price:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!priceData || !priceData.paymentUrl) {
      toast.error(t("calculatePriceFirst"))
      return
    }

    // Redirect to Stripe checkout
    window.location.href = priceData.paymentUrl
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("changeDatesTitle")}</DialogTitle>
          <DialogDescription>{t("changeDatesDesc")}</DialogDescription>
        </DialogHeader>

        {isWithinSevenDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">{t("penalty50")}</p>
              <p className="text-sm">{t("penalty50Desc")}</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <BookingCalendarPicker value={range} onChange={setRange} roomId={bookingData?.roomId || "2"} />
        </div>

        {priceData && (
          <div className="space-y-3 bg-secondary/50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("originalPrice")}</span>
              <span className="font-semibold">€{priceData.originalAmount?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("newBasePrice")}</span>
              <span className="font-semibold">€{priceData.basePrice?.toFixed(2)}</span>
            </div>

            {priceData.penaltyAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground text-destructive">{t("penalty")}</span>
                <span className="font-semibold text-destructive">+€{priceData.penaltyAmount?.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-muted-foreground">{t("newTotalPrice")}</span>
              <span className="font-semibold">€{priceData.newTotalAmount?.toFixed(2)}</span>
            </div>

            <div className="flex justify-between pt-3 border-t-2 border-primary/20">
              <span className="font-semibold text-lg">{t("priceDifference")}</span>
              <span className="text-2xl font-bold text-primary">€{priceData.paymentAmount?.toFixed(2)}</span>
            </div>

            {priceData.priceDifference && priceData.priceDifference > 0 && (
              <p className="text-xs text-muted-foreground italic">{t("includePenalties")}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleCalculatePrice} disabled={loading} variant={priceData ? "outline" : "default"}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {priceData ? t("recalculatePrice") : t("calculateNewPrice")}
          </Button>
          {priceData && (
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("confirmAndPay")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
