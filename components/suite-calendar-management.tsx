"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DateRange } from "react-day-picker"
import { it } from "react-day-picker/locale"
import { eachDayOfInterval, format, parseISO } from "date-fns"
import { CalendarDays, CheckCircle2, Euro, Loader2, LockKeyhole, RotateCcw } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

interface DaySettings {
  price?: number
  available?: boolean
}

interface CalendarResponse {
  roomId: string
  roomName: string
  basePrice: number
  days: Record<string, DaySettings>
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function SuiteCalendarManagement() {
  const { user, refreshToken } = useAuth()
  const [data, setData] = useState<CalendarResponse | null>(null)
  const [range, setRange] = useState<DateRange | undefined>()
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const authenticatedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      let token = user?.idToken
      if (!token) {
        await refreshToken()
        token = user?.idToken
      }

      return fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${token ?? ""}`,
        },
      })
    },
    [refreshToken, user?.idToken],
  )

  const loadCalendar = useCallback(async () => {
    if (!user?.idToken) return
    setLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch("/api/admin/suite-calendar", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Impossibile caricare il calendario")
      setData(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossibile caricare il calendario")
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch, user?.idToken])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  const selectedDates = useMemo(() => {
    if (!range?.from) return []
    return eachDayOfInterval({ start: range.from, end: range.to ?? range.from })
  }, [range])

  const unavailableDates = useMemo(
    () =>
      Object.entries(data?.days ?? {})
        .filter(([, settings]) => settings.available === false)
        .map(([date]) => parseISO(date)),
    [data?.days],
  )

  const customPriceDates = useMemo(
    () =>
      Object.entries(data?.days ?? {})
        .filter(([, settings]) => typeof settings.price === "number")
        .map(([date]) => parseISO(date)),
    [data?.days],
  )

  async function saveChanges(update: { price?: number | null; available?: boolean }, successMessage: string) {
    if (!range?.from) {
      setError("Seleziona prima un giorno o un intervallo")
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await authenticatedFetch("/api/admin/suite-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: toDateKey(range.from),
          to: toDateKey(range.to ?? range.from),
          ...update,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Impossibile salvare le modifiche")

      setMessage(`${successMessage} (${result.updatedDates} ${result.updatedDates === 1 ? "giorno" : "giorni"})`)
      await loadCalendar()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossibile salvare le modifiche")
    } finally {
      setSaving(false)
    }
  }

  function applyPrice() {
    const numericPrice = Number(price.replace(",", "."))
    if (!Number.isFinite(numericPrice) || numericPrice < 1) {
      setError("Inserisci un prezzo valido")
      return
    }
    void saveChanges({ price: numericPrice }, "Prezzo aggiornato")
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent><Skeleton className="h-96 w-full" /></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="flex items-center gap-2 text-balance">
            <CalendarDays />
            Calendario prezzi e disponibilità
          </CardTitle>
          <CardDescription>
            Gestisci La Suite giorno per giorno. Le modifiche valgono esclusivamente sul sito.
          </CardDescription>
        </div>
        <Badge variant="secondary">Prezzo base: €{data?.basePrice ?? 150}</Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="overflow-x-auto rounded-lg border bg-card p-2 md:p-4">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              locale={it}
              defaultMonth={range?.from ?? new Date()}
              modifiers={{ unavailable: unavailableDates, customPrice: customPriceDates }}
              modifiersClassNames={{
                unavailable: "bg-destructive/15 text-destructive line-through",
                customPrice: "font-bold underline decoration-primary decoration-2 underline-offset-4",
              }}
              className="mx-auto w-max"
            />
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Selezione</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {range?.from
                  ? `${format(range.from, "dd/MM/yyyy")}${range.to && toDateKey(range.to) !== toDateKey(range.from) ? ` – ${format(range.to, "dd/MM/yyyy")}` : ""}`
                  : "Seleziona un giorno o trascina un intervallo"}
              </p>
              {selectedDates.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedDates.length} {selectedDates.length === 1 ? "giorno selezionato" : "giorni selezionati"}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="suite-price">Prezzo per notte</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Euro className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="suite-price"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="pl-9"
                    placeholder={String(data?.basePrice ?? 150)}
                  />
                </div>
                <Button onClick={applyPrice} disabled={saving || !range?.from}>Applica</Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => void saveChanges({ price: null }, "Ripristinato il prezzo automatico")}
                disabled={saving || !range?.from}
              >
                <RotateCcw data-icon="inline-start" />
                Ripristina prezzo automatico
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Disponibilità sul sito</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => void saveChanges({ available: true }, "Date aperte")}
                  disabled={saving || !range?.from}
                >
                  <CheckCircle2 data-icon="inline-start" />
                  Apri date
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void saveChanges({ available: false }, "Date chiuse")}
                  disabled={saving || !range?.from}
                >
                  <LockKeyhole data-icon="inline-start" />
                  Chiudi date
                </Button>
              </div>
            </div>

            {saving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="animate-spin" aria-hidden="true" />
                Salvataggio in corso…
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Legenda calendario">
          <Badge variant="outline">Sottolineato: prezzo personalizzato</Badge>
          <Badge variant="destructive">Barrato: non disponibile</Badge>
        </div>

        {message && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Modifica salvata</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Operazione non riuscita</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
