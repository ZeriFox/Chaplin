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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface AddGuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  currentGuests: number
  onSuccess: () => void
}

export function AddGuestDialog({ open, onOpenChange, bookingId, currentGuests, onSuccess }: AddGuestDialogProps) {
  const { t } = useLanguage()
  const [newGuests, setNewGuests] = useState(currentGuests)
  const [loading, setLoading] = useState(false)

  const handleAddGuest = async () => {
    if (newGuests === currentGuests) {
      toast.error(t("selectDifferentNumber"))
      return
    }

    if (newGuests > 4) {
      toast.error(t("maxGuestsReached"))
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/bookings/add-guest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          newGuests,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      if (data.paymentRequired && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toast.success(t("guestsUpdated"))
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message || t("errorUpdatingGuests"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addGuests")}</DialogTitle>
          <DialogDescription>{t("addGuestsDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="guests">{t("newGuestsNumber")}</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={4}
              value={newGuests}
              onChange={(e) => setNewGuests(Number.parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {t("currently")}: {currentGuests} {t("guestsCount")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleAddGuest} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("calculateDifference")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
