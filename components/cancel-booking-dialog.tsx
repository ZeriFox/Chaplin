"use client"

import { useState } from "react"
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
import { useLanguage } from "@/components/language-provider"

interface CancelBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  checkIn: string
  totalAmount: number
  onSuccess: () => void
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  checkIn,
  totalAmount,
  onSuccess,
}: CancelBookingDialogProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  const daysUntilCheckIn = Math.ceil((new Date(checkIn).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const isFullRefund = daysUntilCheckIn >= 7
  const refundAmount = isFullRefund ? totalAmount : 0
  const penalty = isFullRefund ? 0 : totalAmount

  const handleCancel = async () => {
    const confirmed = confirm(
      `${t("cancelBookingDesc")} ${
        isFullRefund
          ? `${t("fullRefundDesc")} €${refundAmount.toFixed(2)}.`
          : `${t("cancellationPenaltyDesc")} €${penalty.toFixed(2)}.`
      }`,
    )

    if (!confirmed) return

    setLoading(true)

    // Use requestIdleCallback to prevent blocking UI
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(async () => {
        await performCancellation()
      })
    } else {
      await performCancellation()
    }
  }

  const performCancellation = async () => {
    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(t("bookingCancelledSuccess"))
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || t("cancellationError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cancelBooking")}</DialogTitle>
          <DialogDescription>{t("cancelBookingDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3 bg-secondary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("originalTotal")}:</span>
              <span className="font-semibold">€{totalAmount.toFixed(2)}</span>
            </div>

            {!isFullRefund && (
              <div className="flex justify-between items-center text-destructive">
                <span className="text-sm font-medium">{t("cancellationPenalty")}:</span>
                <span className="font-bold">-€{penalty.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-medium">{isFullRefund ? t("refundAmount") : t("noRefund")}:</span>
              <span className="text-2xl font-bold text-primary">€{refundAmount.toFixed(2)}</span>
            </div>
          </div>

          {isFullRefund ? (
            <Alert>
              <AlertDescription>
                <p className="text-sm">
                  {t("fullRefundDesc")} {t("within")} {t("businessDays")}.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">{t("cancellationPenalty")}</p>
                <p className="text-sm">{t("cancellationPenaltyDesc")}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-secondary/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground mb-1">{t("daysUntilCheckIn")}</p>
            <p className="text-2xl font-bold">
              {daysUntilCheckIn} {t("days")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("confirmCancellation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
