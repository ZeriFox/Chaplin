"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, CalendarIcon, TrendingUp, Settings, Sparkles, Pencil, Trash2 } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from "date-fns"
import { it } from "date-fns/locale"

type SeasonType = "bassa" | "media" | "medio-alta" | "alta" | "super-alta"

type Season = {
  id: string
  name: string
  type: SeasonType
  startDate: string
  endDate: string
  priceMultiplier: number
  description: string
}

type SpecialPeriod = {
  id: string
  name: string
  startDate: string
  endDate: string
  priceMultiplier: number
  description: string
  priority: number
}

type PriceOverride = {
  id: string
  roomId: string
  date: string
  price: number
  reason: string
}

type RoomBasePrice = {
  roomId: string
  roomName: string
  basePrice: number
}

export function DynamicPricingManagement() {
  const [activeTab, setActiveTab] = useState("calendar")
  const [rooms, setRooms] = useState<RoomBasePrice[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriod[]>([])
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>("2")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [editingSeason, setEditingSeason] = useState<Season | null>(null)
  const [editingPeriod, setEditingPeriod] = useState<SpecialPeriod | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    console.log("[v0] Pricing Management - Loading data...")
    loadPricingData()
    checkInitialization()
  }, [])

  async function checkInitialization() {
    try {
      console.log("[v0] Checking if pricing is initialized...")
      const res = await fetch("/api/pricing/initialize-defaults")

      if (!res.ok) {
        console.error("[v0] Failed to check initialization:", res.status)
        setIsInitialized(false)
        return
      }

      const data = await res.json()
      console.log("[v0] Initialization status:", data)

      const initialized = data.seasons > 0 && data.specialPeriods > 0
      console.log(
        "[v0] Is initialized?",
        initialized,
        "- Seasons:",
        data.seasons,
        "Special Periods:",
        data.specialPeriods,
      )
      setIsInitialized(initialized)
    } catch (error) {
      console.error("[v0] Error checking initialization:", error)
      setIsInitialized(false)
    }
  }

  async function handleInitializeDefaults() {
    console.log("[v0] Starting initialization...")

    try {
      setInitLoading(true)
      console.log("[v0] Calling POST /api/pricing/initialize-defaults...")

      const res = await fetch("/api/pricing/initialize-defaults", {
        method: "POST",
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("[v0] Initialization failed:", res.status, errorText)
        throw new Error(`Failed to initialize: ${errorText}`)
      }

      const data = await res.json()
      console.log("[v0] Initialization complete:", data)

      toast({
        title: "✅ Inizializzazione Completata!",
        description: `Creati ${data.seasons} stagioni e ${data.specialPeriods} periodi speciali`,
      })

      setIsInitialized(true)

      console.log("[v0] Reloading pricing data after initialization...")
      await loadPricingData()
    } catch (error) {
      console.error("[v0] Initialization error:", error)
      toast({
        title: "❌ Errore",
        description: `Impossibile inizializzare: ${error}`,
        variant: "destructive",
      })
    } finally {
      setInitLoading(false)
    }
  }

  async function loadPricingData() {
    try {
      setLoading(true)
      console.log("[v0] Loading pricing data...")

      const roomsRes = await fetch("/api/pricing/rooms")
      const roomsData = await roomsRes.json()
      console.log("[v0] Rooms loaded:", roomsData)
      setRooms(roomsData)

      const seasonsRes = await fetch("/api/pricing/seasons")
      const seasonsData = await seasonsRes.json()
      console.log("[v0] Seasons loaded:", seasonsData)
      setSeasons(seasonsData)

      const periodsRes = await fetch("/api/pricing/special-periods")
      const periodsData = await periodsRes.json()
      console.log("[v0] Special periods loaded:", periodsData)
      setSpecialPeriods(periodsData)

      const overridesRes = await fetch("/api/pricing/overrides")
      const overridesData = await overridesRes.json()
      console.log("[v0] Overrides loaded:", overridesData)
      setPriceOverrides(overridesData)
    } catch (error) {
      console.error("[v0] Error loading pricing data:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati dei prezzi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function calculatePriceForDate(date: Date, roomId: string): number {
    const dateStr = format(date, "yyyy-MM-dd")
    const room = rooms.find((r) => r.roomId === roomId)

    if (!room) {
      console.warn(`[v0] Room ${roomId} not found`)
      return 0
    }

    const override = priceOverrides.find((o) => o.roomId === roomId && o.date === dateStr)
    if (override) {
      console.log(`[v0] ${dateStr}: Override → €${override.price}`)
      return override.price
    }

    const specialPeriod = specialPeriods.find((p) => {
      // Parse dates without time to avoid timezone issues
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const startParts = p.startDate.split("-")
      const endParts = p.endDate.split("-")

      const start = new Date(
        Number.parseInt(startParts[0]),
        Number.parseInt(startParts[1]) - 1,
        Number.parseInt(startParts[2]),
      )
      const end = new Date(Number.parseInt(endParts[0]), Number.parseInt(endParts[1]) - 1, Number.parseInt(endParts[2]))

      const isInRange = checkDate >= start && checkDate <= end

      if (isInRange) {
        console.log(`[v0] ${dateStr}: Matched special period "${p.name}" (${p.startDate} to ${p.endDate})`)
      }

      return isInRange
    })

    if (specialPeriod) {
      const price = Math.round(room.basePrice * specialPeriod.priceMultiplier)
      console.log(
        `[v0] ${dateStr}: Special Period "${specialPeriod.name}" (${specialPeriod.priceMultiplier}x) → €${price}`,
      )
      return price
    }

    const monthDay = format(date, "MM-dd") // "12-25"

    const season = seasons.find((s) => {
      const seasonStart = s.startDate // "11-01"
      const seasonEnd = s.endDate // "11-30"

      // Handle year-end wrap (e.g., 12-25 to 01-05)
      if (seasonStart <= seasonEnd) {
        // Normal range within same year
        const isInRange = monthDay >= seasonStart && monthDay <= seasonEnd
        if (isInRange) {
          console.log(`[v0] ${dateStr}: Matched season "${s.name}" (${seasonStart} to ${seasonEnd})`)
        }
        return isInRange
      } else {
        // Wrap around year end (e.g., 12-25 to 01-05)
        const isInRange = monthDay >= seasonStart || monthDay <= seasonEnd
        if (isInRange) {
          console.log(`[v0] ${dateStr}: Matched season "${s.name}" (wrap: ${seasonStart} to ${seasonEnd})`)
        }
        return isInRange
      }
    })

    if (season) {
      const price = Math.round(room.basePrice * season.priceMultiplier)
      console.log(`[v0] ${dateStr}: Season "${season.name}" (${season.priceMultiplier}x) → €${price}`)
      return price
    }

    // Priority 4: Base price
    console.log(`[v0] ${dateStr}: Base price → €${room.basePrice}`)
    return room.basePrice
  }

  function getPriceCategory(price: number, basePrice: number): SeasonType {
    const ratio = price / basePrice
    if (ratio >= 2.5) return "super-alta"
    if (ratio >= 1.7) return "alta"
    if (ratio >= 1.3) return "medio-alta"
    if (ratio >= 1.0) return "media"
    return "bassa"
  }

  function getCategoryColor(category: SeasonType): string {
    switch (category) {
      case "super-alta":
        return "bg-red-500"
      case "alta":
        return "bg-orange-500"
      case "medio-alta":
        return "bg-yellow-500"
      case "media":
        return "bg-green-500"
      case "bassa":
        return "bg-blue-500"
    }
  }

  async function handleBasePriceUpdate(roomId: string, newPrice: number) {
    try {
      const res = await fetch("/api/pricing/update-base-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, basePrice: newPrice }),
      })

      if (!res.ok) throw new Error("Failed to update base price")

      toast({
        title: "Successo",
        description: "Prezzo base aggiornato con successo",
      })

      await loadPricingData()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il prezzo base",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteSeason(seasonId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa stagione?")) return

    try {
      const res = await fetch(`/api/pricing/seasons?id=${seasonId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete season")

      toast({
        title: "Successo",
        description: "Stagione eliminata con successo",
      })

      await loadPricingData()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la stagione",
        variant: "destructive",
      })
    }
  }

  async function handleDeletePeriod(periodId: string) {
    if (!confirm("Sei sicuro di voler eliminare questo periodo?")) return

    try {
      const res = await fetch(`/api/pricing/special-periods?id=${periodId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete period")

      toast({
        title: "Successo",
        description: "Periodo eliminato con successo",
      })

      await loadPricingData()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il periodo",
        variant: "destructive",
      })
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const room = rooms.find((r) => r.roomId === selectedRoom)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Caricamento sistema prezzi dinamici...</p>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-red-500 font-semibold">Nessuna camera trovata nel database!</p>
        <p className="text-sm text-muted-foreground">
          Assicurati che le camere siano state create nella collezione "rooms" di Firestore con i campi "name" e
          "price".
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gestione Prezzi Dinamici</h2>
          <p className="text-muted-foreground">Configura stagioni, periodi speciali e override manuali</p>
        </div>
        <Button
          onClick={handleInitializeDefaults}
          disabled={initLoading}
          size="lg"
          className="gap-2"
          variant={isInitialized ? "outline" : "default"}
        >
          <Sparkles className="h-5 w-5" />
          {initLoading
            ? "Inizializzazione..."
            : isInitialized
              ? "Reinizializza Sistema"
              : "Inizializza Stagioni Automaticamente"}
        </Button>
      </div>

      {!isInitialized && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Sparkles className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">⚠️ Sistema non inizializzato</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clicca sul pulsante "Inizializza Stagioni Automaticamente" per pre-popolare automaticamente tutte le
                  stagioni e i periodi speciali per Polignano a Mare (Natale, Pasqua, Ferragosto, Red Bull Cliff Diving,
                  ecc.)
                </p>
                <p className="text-sm font-semibold">
                  Trovate: {seasons.length} stagioni, {specialPeriods.length} periodi speciali
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isInitialized && (
        <div className="text-sm text-muted-foreground">
          📊 Sistema inizializzato: {seasons.length} stagioni, {specialPeriods.length} periodi speciali caricati
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendario Prezzi
          </TabsTrigger>
          <TabsTrigger value="base">
            <TrendingUp className="mr-2 h-4 w-4" />
            Prezzi Base
          </TabsTrigger>
          <TabsTrigger value="seasons">
            <Settings className="mr-2 h-4 w-4" />
            Stagioni
          </TabsTrigger>
          <TabsTrigger value="special">
            <Plus className="mr-2 h-4 w-4" />
            Periodi Speciali
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendario Prezzi Camera</CardTitle>
              <CardDescription>Visualizza i prezzi dinamici per ogni giorno del mese</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>Camera:</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.roomId} value={r.roomId}>
                        {r.roomName} (Base: €{r.basePrice})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                  ← Mese Precedente
                </Button>
                <h3 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy", { locale: it })}</h3>
                <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  Mese Successivo →
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-500">Bassa</Badge>
                <Badge className="bg-green-500">Media</Badge>
                <Badge className="bg-yellow-500">Medio-Alta</Badge>
                <Badge className="bg-orange-500">Alta</Badge>
                <Badge className="bg-red-500">Super-Alta</Badge>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"].map((day) => (
                  <div key={day} className="text-center font-semibold text-sm p-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {daysInMonth.map((day) => {
                  const price = calculatePriceForDate(day, selectedRoom)
                  const category = getPriceCategory(price, room?.basePrice || 0)
                  const colorClass = getCategoryColor(category)

                  return (
                    <div
                      key={day.toISOString()}
                      className={`${colorClass} rounded-lg p-3 text-white text-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity`}
                    >
                      <div className="text-sm font-semibold">{format(day, "d")}</div>
                      <div className="text-xs font-bold">€{price}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="base" className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.roomId}>
              <CardHeader>
                <CardTitle>{room.roomName}</CardTitle>
                <CardDescription>Prezzo base per notte (prima dei moltiplicatori stagionali)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`base-price-${room.roomId}`}>Prezzo Base (€)</Label>
                    <Input
                      id={`base-price-${room.roomId}`}
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={room.basePrice}
                    />
                  </div>
                  <Button
                    onClick={(e) => {
                      const input = e.currentTarget.parentElement?.querySelector("input")
                      if (input) {
                        handleBasePriceUpdate(room.roomId, Number.parseFloat(input.value))
                      }
                    }}
                  >
                    Aggiorna Prezzo Base
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Prezzo attuale: €{room.basePrice}/notte</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="seasons" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stagioni Ricorrenti</CardTitle>
                  <CardDescription>
                    Le stagioni si ripetono automaticamente ogni anno senza bisogno di aggiornamenti
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Aggiungi Stagione
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuova Stagione</DialogTitle>
                    </DialogHeader>
                    <SeasonForm onSave={loadPricingData} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seasons.map((season) => (
                  <div key={season.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{season.name}</h4>
                      <p className="text-sm text-muted-foreground">{season.description}</p>
                      <p className="text-sm">
                        Dal {season.startDate} al {season.endDate} (ogni anno)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(season.type)}>
                        {season.priceMultiplier > 1 ? "+" : ""}
                        {Math.round((season.priceMultiplier - 1) * 100)}%
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingSeason(season)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifica Stagione</DialogTitle>
                          </DialogHeader>
                          <SeasonForm
                            onSave={() => {
                              setEditingSeason(null)
                              loadPricingData()
                            }}
                            initialData={season}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSeason(season.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Periodi Speciali</CardTitle>
                  <CardDescription>
                    Feste, eventi e periodi con prezzi speciali (hanno priorità sulle stagioni)
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Aggiungi Periodo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuovo Periodo Speciale</DialogTitle>
                    </DialogHeader>
                    <SpecialPeriodForm onSave={loadPricingData} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {specialPeriods.map((period) => (
                  <div key={period.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{period.name}</h4>
                      <p className="text-sm text-muted-foreground">{period.description}</p>
                      <p className="text-sm">
                        Dal {format(new Date(period.startDate), "dd/MM/yyyy", { locale: it })} al{" "}
                        {format(new Date(period.endDate), "dd/MM/yyyy", { locale: it })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {period.priceMultiplier > 1 ? "+" : ""}
                        {Math.round((period.priceMultiplier - 1) * 100)}%
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setEditingPeriod(period)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Modifica Periodo Speciale</DialogTitle>
                          </DialogHeader>
                          <SpecialPeriodForm
                            onSave={() => {
                              setEditingPeriod(null)
                              loadPricingData()
                            }}
                            initialData={period}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePeriod(period.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SeasonForm({ onSave, initialData }: { onSave: () => void; initialData?: Season }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const startDateFull = formData.get("startDate") as string // "2025-12-01"
    const endDateFull = formData.get("endDate") as string // "2025-12-31"

    const startDate = startDateFull.substring(5) // "12-01"
    const endDate = endDateFull.substring(5) // "12-31"

    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as SeasonType,
      startDate, // Only MM-DD!
      endDate, // Only MM-DD!
      priceMultiplier: Number.parseFloat(formData.get("priceMultiplier") as string),
      description: formData.get("description") as string,
    }

    try {
      const url = initialData ? `/api/pricing/seasons?id=${initialData.id}` : "/api/pricing/seasons"
      const method = initialData ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Failed to save season")

      toast({
        title: "Successo",
        description: initialData ? "Stagione aggiornata con successo" : "Stagione creata con successo",
      })

      onSave()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare la stagione",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const displayStartDate = initialData?.startDate ? `2025-${initialData.startDate}` : ""
  const displayEndDate = initialData?.endDate ? `2025-${initialData.endDate}` : ""

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome Stagione</Label>
        <Input id="name" name="name" required placeholder="es: Estate Alta Stagione" defaultValue={initialData?.name} />
      </div>

      <div>
        <Label htmlFor="type">Tipologia</Label>
        <Select name="type" required defaultValue={initialData?.type}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona tipologia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bassa">Stagione Bassa</SelectItem>
            <SelectItem value="media">Stagione Media</SelectItem>
            <SelectItem value="medio-alta">Stagione Medio-Alta</SelectItem>
            <SelectItem value="alta">Stagione Alta</SelectItem>
            <SelectItem value="super-alta">Stagione Super-Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Data Inizio</Label>
          <Input id="startDate" name="startDate" type="date" required defaultValue={displayStartDate} />
          <p className="text-xs text-muted-foreground mt-1">Si ripete ogni anno</p>
        </div>
        <div>
          <Label htmlFor="endDate">Data Fine</Label>
          <Input id="endDate" name="endDate" type="date" required defaultValue={displayEndDate} />
          <p className="text-xs text-muted-foreground mt-1">Si ripete ogni anno</p>
        </div>
      </div>

      <div>
        <Label htmlFor="priceMultiplier">Moltiplicatore Prezzo</Label>
        <Input
          id="priceMultiplier"
          name="priceMultiplier"
          type="number"
          step="0.1"
          min="0.5"
          max="3"
          required
          placeholder="es: 1.5 per +50%"
          defaultValue={initialData?.priceMultiplier}
        />
        <p className="text-xs text-muted-foreground mt-1">1.0 = prezzo base, 1.5 = +50%, 2.0 = +100%</p>
      </div>

      <div>
        <Label htmlFor="description">Descrizione</Label>
        <Input
          id="description"
          name="description"
          placeholder="es: Agosto - Ferragosto"
          defaultValue={initialData?.description}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Salvataggio..." : initialData ? "Aggiorna Stagione" : "Crea Stagione"}
      </Button>
    </form>
  )
}

function SpecialPeriodForm({ onSave, initialData }: { onSave: () => void; initialData?: SpecialPeriod }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      priceMultiplier: Number.parseFloat(formData.get("priceMultiplier") as string),
      description: formData.get("description") as string,
      priority: 1,
    }

    try {
      const url = initialData ? `/api/pricing/special-periods?id=${initialData.id}` : "/api/pricing/special-periods"
      const method = initialData ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Failed to save special period")

      toast({
        title: "Successo",
        description: initialData ? "Periodo aggiornato con successo" : "Periodo creato con successo",
      })

      onSave()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare il periodo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome Periodo</Label>
        <Input id="name" name="name" required placeholder="es: Ferragosto 2025" defaultValue={initialData?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Data Inizio</Label>
          <Input id="startDate" name="startDate" type="date" required defaultValue={initialData?.startDate} />
        </div>
        <div>
          <Label htmlFor="endDate">Data Fine</Label>
          <Input id="endDate" name="endDate" type="date" required defaultValue={initialData?.endDate} />
        </div>
      </div>

      <div>
        <Label htmlFor="priceMultiplier">Moltiplicatore Prezzo</Label>
        <Input
          id="priceMultiplier"
          name="priceMultiplier"
          type="number"
          step="0.1"
          min="0.5"
          max="5"
          required
          placeholder="es: 2.5 per +150%"
          defaultValue={initialData?.priceMultiplier}
        />
        <p className="text-xs text-muted-foreground mt-1">1.0 = prezzo base, 2.0 = +100%, 2.5 = +150%</p>
      </div>

      <div>
        <Label htmlFor="description">Descrizione</Label>
        <Input
          id="description"
          name="description"
          placeholder="es: Picco di prenotazioni"
          defaultValue={initialData?.description}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Salvataggio..." : initialData ? "Aggiorna Periodo" : "Crea Periodo"}
      </Button>
    </form>
  )
}
