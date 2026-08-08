"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { Ban, Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { getCurrentIdToken } from "@/lib/firebase"
import type { Booking, Room } from "@/lib/booking-utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type AdminBooking = Booking & {
  firstName?: string
  lastName?: string
  totalAmount?: number
  specialRequests?: string
}

type BookingFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  roomId: string
  checkIn: string
  checkOut: string
  guests: string
  totalAmount: string
  notes: string
  status: "pending" | "confirmed"
}

function getInitialForm(rooms: Room[], booking?: AdminBooking): BookingFormState {
  return {
    firstName: booking?.guestFirst || booking?.firstName || "",
    lastName: booking?.guestLast || booking?.lastName || "",
    email: booking?.email || "",
    phone: booking?.phone || "",
    roomId: booking?.roomId || rooms[0]?.id || "",
    checkIn: booking?.checkIn || "",
    checkOut: booking?.checkOut || "",
    guests: String(booking?.guests || 2),
    totalAmount: String(booking?.total ?? booking?.totalAmount ?? ""),
    notes: booking?.notes || booking?.specialRequests || "",
    status: booking?.status === "pending" ? "pending" : "confirmed",
  }
}

async function getAdminHeaders() {
  const token = await getCurrentIdToken()
  if (!token) throw new Error("Sessione admin scaduta: accedi nuovamente")

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

function BookingFormDialog({
  rooms,
  booking,
  trigger,
}: {
  rooms: Room[]
  booking?: AdminBooking
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<BookingFormState>(() => getInitialForm(rooms, booking))
  const isEditing = Boolean(booking)

  useEffect(() => {
    if (open) setForm(getInitialForm(rooms, booking))
  }, [open, rooms, booking])

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === form.roomId),
    [rooms, form.roomId],
  )

  const updateField = <Key extends keyof BookingFormState>(key: Key, value: BookingFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedRoom) {
      toast.error("Seleziona una suite valida")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/bookings", {
        method: isEditing ? "PATCH" : "POST",
        headers: await getAdminHeaders(),
        body: JSON.stringify({
          ...(booking ? { id: booking.id } : {}),
          ...form,
          roomName: selectedRoom.name,
          guests: Number(form.guests),
          totalAmount: Number(form.totalAmount) || 0,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Operazione non riuscita")

      toast.success(isEditing ? "Prenotazione aggiornata" : "Prenotazione aggiunta")
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operazione non riuscita")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifica prenotazione" : "Nuova prenotazione"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-firstName`}>Nome *</Label>
              <Input
                id={`${booking?.id || "new"}-firstName`}
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-lastName`}>Cognome *</Label>
              <Input
                id={`${booking?.id || "new"}-lastName`}
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-email`}>Email *</Label>
              <Input
                id={`${booking?.id || "new"}-email`}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-phone`}>Telefono *</Label>
              <Input
                id={`${booking?.id || "new"}-phone`}
                type="tel"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${booking?.id || "new"}-room`}>Suite *</Label>
            <select
              id={`${booking?.id || "new"}-room`}
              value={form.roomId}
              onChange={(event) => updateField("roomId", event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="" disabled>Seleziona la suite</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-checkIn`}>Check-in *</Label>
              <Input
                id={`${booking?.id || "new"}-checkIn`}
                type="date"
                value={form.checkIn}
                onChange={(event) => updateField("checkIn", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-checkOut`}>Check-out *</Label>
              <Input
                id={`${booking?.id || "new"}-checkOut`}
                type="date"
                min={form.checkIn || undefined}
                value={form.checkOut}
                onChange={(event) => updateField("checkOut", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-guests`}>Ospiti</Label>
              <select
                id={`${booking?.id || "new"}-guests`}
                value={form.guests}
                onChange={(event) => updateField("guests", event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1">1 ospite</option>
                <option value="2">2 ospiti</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${booking?.id || "new"}-total`}>Totale (€)</Label>
              <Input
                id={`${booking?.id || "new"}-total`}
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={(event) => updateField("totalAmount", event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${booking?.id || "new"}-status`}>Stato</Label>
              <select
                id={`${booking?.id || "new"}-status`}
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as BookingFormState["status"])}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="pending">In attesa</option>
                <option value="confirmed">Confermata</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${booking?.id || "new"}-notes`}>Note</Label>
            <Textarea
              id={`${booking?.id || "new"}-notes`}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={4}
              placeholder="Note interne o richieste del cliente"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Chiudi
            </Button>
            <Button type="submit" disabled={saving || rooms.length === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salva modifiche" : "Aggiungi prenotazione"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AdminBookingCreateButton({ rooms }: { rooms: Room[] }) {
  return (
    <BookingFormDialog
      rooms={rooms}
      trigger={
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuova prenotazione
        </Button>
      }
    />
  )
}

export function AdminBookingActions({ booking, rooms }: { booking: AdminBooking; rooms: Room[] }) {
  const [cancelling, setCancelling] = useState(false)

  const cancelBooking = async () => {
    setCancelling(true)
    try {
      const response = await fetch(`/api/admin/bookings?id=${encodeURIComponent(booking.id)}`, {
        method: "DELETE",
        headers: await getAdminHeaders(),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Annullamento non riuscito")
      toast.success("Prenotazione annullata")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Annullamento non riuscito")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BookingFormDialog
        rooms={rooms}
        booking={booking}
        trigger={
          <Button type="button" size="sm" variant="outline">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Modifica
          </Button>
        }
      />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive" disabled={cancelling}>
            {cancelling ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Ban className="mr-1.5 h-3.5 w-3.5" />}
            Annulla
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare questa prenotazione?</AlertDialogTitle>
            <AlertDialogDescription>
              La prenotazione resterà nello storico come annullata e le date torneranno disponibili.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Indietro</AlertDialogCancel>
            <AlertDialogAction onClick={cancelBooking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Conferma annullamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
