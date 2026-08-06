"use client"

import { useEffect, useMemo, useState } from "react"
import { addMonths, eachDayOfInterval, endOfMonth, format, isWithinInterval, startOfMonth } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, Save, TrendingUp } from "lucide-react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type RoomBasePrice = { roomId: string; roomName: string; basePrice: number }
type Season = { id: string; name: string; startDate: string; endDate: string; priceMultiplier: number }
type SpecialPeriod = { id: string; name: string; startDate: string; endDate: string; priceMultiplier: number }
type PriceOverride = { id: string; roomId: string; date: string; price: number; reason?: string }
type StoredOverride = { price?: number; reason?: string }

type DayPrice = {
  price: number
  source: "manual" | "special" | "season" | "base"
  label: string
}

const SUITE_ROOM_ID = "2"
const SUITE_DEFAULT_PRICE = 150
const SUITE_DEFAULT_DATA = {
  name: "La Suite",
  description: "Elegante suite con vasca idromassaggio, area spa privata e arredi di lusso.",
  capacity: 2,
  beds: 1,
  bathrooms: 1,
  size: 57,
  status: "available",
  amenities: [
    "Vasca idromassaggio",
    "Area spa privata",
    "Aria condizionata",
    "TV satellitare",
    "WiFi gratuito",
    "Minibar",
    "Asciugacapelli",
    "Cucina attrezzata",
  ],
  images: ["/images/chaplin-camera-matrimoniale.jpeg", "/images/spa1.jpg", "/images/room-1.jpg"],
}

function waitForSignedInUser(): Promise<FirebaseUser> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe()
      reject(new Error("Sessione amministratore non disponibile"))
    }, 8000)

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return
      window.clearTimeout(timeout)
      unsubscribe()
      resolve(user)
    })
  })
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateToStorageKey(date: string) {
  return `d_${date.replace(/-/g, "_")}`
}

function storageKeyToDate(key: string) {
  if (/^d_\d{4}_\d{2}_\d{2}$/.test(key)) return key.slice(2).replace(/_/g, "-")
  return key
}

function enumerateDates(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)
  const values: string[] = []

  for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 1)) {
    values.push(current.toISOString().slice(0, 10))
    if (values.length > 366) throw new Error("Puoi modificare al massimo 366 giorni alla volta")
  }

  return values
}

async function safeCollection<T>(name: string): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, name))
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T)
  } catch (error) {
    console.warn(`[pricing] Collezione opzionale ${name} non disponibile`, error)
    return []
  }
}

function roomOverridesToArray(raw: unknown): PriceOverride[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return []

  return Object.entries(raw as Record<string, StoredOverride>)
    .map(([key, value]) => ({
      id: `${SUITE_ROOM_ID}_${storageKeyToDate(key)}`,
      roomId: SUITE_ROOM_ID,
      date: storageKeyToDate(key),
      price: Number(value?.price || 0),
      reason: value?.reason,
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.price) && item.price > 0)
}

async function ensureSuiteRoom(user: FirebaseUser) {
  const roomRef = doc(db, "rooms", SUITE_ROOM_ID)
  let snapshot = await getDoc(roomRef)

  if (!snapshot.exists()) {
    await setDoc(roomRef, {
      ...SUITE_DEFAULT_DATA,
      price: SUITE_DEFAULT_PRICE,
      priceOverrides: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    snapshot = await getDoc(roomRef)
  }

  const data = snapshot.data() || {}
  const basePrice = Number(data.price)

  return {
    roomRef,
    room: {
      roomId: SUITE_ROOM_ID,
      roomName: String(data.name || SUITE_DEFAULT_DATA.name),
      basePrice: Number.isFinite(basePrice) && basePrice > 0 ? basePrice : SUITE_DEFAULT_PRICE,
    } satisfies RoomBasePrice,
    overrides: roomOverridesToArray(data.priceOverrides),
  }
}

export function DynamicPricingManagement() {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<RoomBasePrice[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriod[]>([])
  const [overrides, setOverrides] = useState<PriceOverride[]>([])
  const [selectedRoom, setSelectedRoom] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [rangePrice, setRangePrice] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState("")

  async function loadData() {
    setLoading(true)
    setLoadError("")

    try {
      const user = await waitForSignedInUser()
      const suite = await ensureSuiteRoom(user)
      const [seasonsData, periodsData, legacyOverrides] = await Promise.all([
        safeCollection<Season>("pricing_seasons"),
        safeCollection<SpecialPeriod>("pricing_special_periods"),
        safeCollection<PriceOverride>("pricing_overrides"),
      ])

      const mergedOverrides = new Map<string, PriceOverride>()
      legacyOverrides
        .filter((item) => item.roomId === SUITE_ROOM_ID)
        .forEach((item) => mergedOverrides.set(item.date, item))
      suite.overrides.forEach((item) => mergedOverrides.set(item.date, item))

      setRooms([suite.room])
      setSeasons(seasonsData)
      setSpecialPeriods(periodsData)
      setOverrides(Array.from(mergedOverrides.values()))
      setSelectedRoom(SUITE_ROOM_ID)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Caricamento fallito"
      setLoadError(message)
      toast({ title: "Errore", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const room = rooms.find((item) => item.roomId === selectedRoom)
  const monthStart = startOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) })

  const selectedInterval = useMemo(() => {
    if (!rangeStart) return null
    const start = parseLocalDate(rangeStart)
    const end = parseLocalDate(rangeEnd || rangeStart)
    return start <= end ? { start, end } : { start: end, end: start }
  }, [rangeStart, rangeEnd])

  function calculateDayPrice(day: Date): DayPrice {
    const date = format(day, "yyyy-MM-dd")
    const basePrice = room?.basePrice || 0
    const manual = overrides.find((item) => item.roomId === selectedRoom && item.date === date)
    if (manual) return { price: manual.price, source: "manual", label: manual.reason || "Prezzo manuale" }

    const special = specialPeriods.find((item) => date >= item.startDate && date <= item.endDate)
    if (special) return { price: Math.round(basePrice * special.priceMultiplier), source: "special", label: special.name }

    const monthDay = format(day, "MM-dd")
    const season = seasons.find((item) =>
      item.startDate <= item.endDate
        ? monthDay >= item.startDate && monthDay <= item.endDate
        : monthDay >= item.startDate || monthDay <= item.endDate,
    )
    if (season) return { price: Math.round(basePrice * season.priceMultiplier), source: "season", label: season.name }

    return { price: basePrice, source: "base", label: "Prezzo base" }
  }

  function selectDay(day: Date) {
    const value = format(day, "yyyy-MM-dd")
    if (!rangeStart || rangeEnd) {
      setRangeStart(value)
      setRangeEnd(null)
      return
    }
    if (value < rangeStart) {
      setRangeEnd(rangeStart)
      setRangeStart(value)
    } else {
      setRangeEnd(value)
    }
  }

  function clearSelection() {
    setRangeStart(null)
    setRangeEnd(null)
    setRangePrice("")
    setReason("")
  }

  async function applyManualPrice() {
    if (!rangeStart || !rangePrice) return
    setSaving(true)

    try {
      const user = await waitForSignedInUser()
      const suite = await ensureSuiteRoom(user)
      const price = Math.round(Number(rangePrice) * 100) / 100
      if (!Number.isFinite(price) || price <= 0) throw new Error("Prezzo non valido")

      const dates = enumerateDates(rangeStart, rangeEnd || rangeStart)
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }
      const note = reason.trim() || "Prezzo manuale da calendario"

      for (const date of dates) {
        updates[`priceOverrides.${dateToStorageKey(date)}`] = { price, reason: note }
      }

      await updateDoc(suite.roomRef, updates)
      toast({ title: "Prezzi aggiornati", description: `${dates.length} giorni modificati con successo.` })
      clearSelection()
      await loadData()
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Salvataggio fallito", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function resetManualPrices() {
    if (!rangeStart) return
    setSaving(true)

    try {
      const user = await waitForSignedInUser()
      const suite = await ensureSuiteRoom(user)
      const dates = enumerateDates(rangeStart, rangeEnd || rangeStart)
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }

      for (const date of dates) {
        updates[`priceOverrides.${dateToStorageKey(date)}`] = deleteField()
      }

      await updateDoc(suite.roomRef, updates)
      toast({ title: "Prezzi ripristinati", description: "I giorni selezionati usano nuovamente il prezzo automatico." })
      clearSelection()
      await loadData()
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Ripristino fallito", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function updateBasePrice() {
    if (!rangePrice) return
    setSaving(true)

    try {
      const user = await waitForSignedInUser()
      const suite = await ensureSuiteRoom(user)
      const basePrice = Math.round(Number(rangePrice) * 100) / 100
      if (!Number.isFinite(basePrice) || basePrice <= 0) throw new Error("Prezzo non valido")

      await setDoc(
        suite.roomRef,
        {
          ...SUITE_DEFAULT_DATA,
          price: basePrice,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        },
        { merge: true },
      )

      toast({ title: "Prezzo base aggiornato" })
      setRangePrice("")
      await loadData()
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Aggiornamento fallito", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Caricamento prezzi…</div>
  if (!room) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-destructive">Impossibile caricare La Suite{loadError ? `: ${loadError}` : "."}</p>
        <Button variant="outline" onClick={loadData}>Riprova</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Gestione prezzi La Suite</h2>
        <p className="text-muted-foreground">Seleziona un giorno oppure un intervallo e assegna lo stesso prezzo a tutte le notti.</p>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar"><CalendarIcon className="mr-2 h-4 w-4" />Calendario giornaliero</TabsTrigger>
          <TabsTrigger value="base"><TrendingUp className="mr-2 h-4 w-4" />Prezzo base</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tariffe giornaliere</CardTitle>
              <CardDescription>Un clic sceglie l’inizio; il secondo clic completa l’intervallo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Select value={selectedRoom} onValueChange={(value) => { setSelectedRoom(value); clearSelection() }}>
                  <SelectTrigger className="w-full sm:w-[320px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{rooms.map((item) => <SelectItem key={item.roomId} value={item.roomId}>{item.roomName} · base €{item.basePrice}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <strong className="min-w-40 text-center capitalize">{format(currentMonth, "MMMM yyyy", { locale: it })}</strong>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Base / stagione</Badge>
                <Badge className="bg-amber-600">Periodo speciale</Badge>
                <Badge className="bg-violet-700">Manuale</Badge>
                <Badge className="bg-primary">Selezionato</Badge>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((label) => <div key={label} className="p-1 text-center text-xs font-semibold text-muted-foreground sm:p-2">{label}</div>)}
                {Array.from({ length: monthStart.getDay() }).map((_, index) => <div key={`empty-${index}`} />)}
                {days.map((day) => {
                  const value = format(day, "yyyy-MM-dd")
                  const details = calculateDayPrice(day)
                  const selected = selectedInterval ? isWithinInterval(day, selectedInterval) : false
                  const sourceClass = details.source === "manual" ? "bg-violet-700 text-white" : details.source === "special" ? "bg-amber-600 text-white" : "bg-muted"
                  return (
                    <button key={value} type="button" onClick={() => selectDay(day)} title={details.label} className={`min-h-16 rounded-md border p-1 text-center transition hover:ring-2 hover:ring-primary sm:min-h-20 sm:p-2 ${selected ? "bg-primary text-primary-foreground ring-2 ring-primary" : sourceClass}`}>
                      <div className="text-xs font-semibold sm:text-sm">{format(day, "d")}</div>
                      <div className="mt-1 text-xs font-bold sm:text-base">€{details.price}</div>
                      <div className="mt-1 hidden truncate text-[10px] opacity-80 sm:block">{details.label}</div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modifica giorni selezionati</CardTitle>
              <CardDescription>{rangeStart ? `${rangeStart} → ${rangeEnd || rangeStart}` : "Seleziona prima uno o più giorni dal calendario."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label htmlFor="manual-price">Prezzo per notte (€)</Label><Input id="manual-price" type="number" min="1" step="0.01" value={rangePrice} onChange={(event) => setRangePrice(event.target.value)} placeholder="es. 180" /></div>
                <div><Label htmlFor="manual-reason">Nota facoltativa</Label><Input id="manual-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="es. Ponte, evento, promozione" /></div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={applyManualPrice} disabled={!rangeStart || !rangePrice || saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvataggio…" : "Applica prezzo all’intervallo"}</Button>
                <Button variant="outline" onClick={resetManualPrices} disabled={!rangeStart || saving}><RotateCcw className="mr-2 h-4 w-4" />Ripristina prezzo automatico</Button>
                <Button variant="ghost" onClick={clearSelection} disabled={!rangeStart}>Annulla selezione</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="base">
          <Card>
            <CardHeader><CardTitle>Prezzo base della Suite</CardTitle><CardDescription>Usato quando non esistono prezzi manuali, periodi speciali o stagioni.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-2xl font-bold">€{room.basePrice} / notte</p>
              <div className="flex max-w-md flex-col gap-2 sm:flex-row">
                <Input type="number" min="1" step="0.01" value={rangePrice} onChange={(event) => setRangePrice(event.target.value)} placeholder="Nuovo prezzo base" />
                <Button onClick={updateBasePrice} disabled={!rangePrice || saving}>Aggiorna</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
