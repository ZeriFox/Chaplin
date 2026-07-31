"use client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, BarChart3, Home, Settings, Users, Clock, Euro, Sparkles, TestTube, ContactRound } from "lucide-react"
import { RequireAdmin } from "@/components/route-guards"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, orderBy, query, doc, setDoc, getDoc } from "firebase/firestore"
import { BookingCalendar } from "@/components/booking-calendar"
import { RoomStatusToggle } from "@/components/room-status-toggle"
import { GuestsTracking } from "@/components/guests-tracking"
import { SmoobuSyncPanel } from "@/components/smoobu-sync-panel"
import { SmoobuReviewsSync } from "@/components/smoobu-reviews-sync"
import { BookingBlockDates } from "@/components/booking-block-dates"
import { BookingCalendarFiltered } from "@/components/booking-calendar-filtered"
import { AdminSecuritySettings } from "@/components/admin-security-settings"
import { DynamicPricingManagement } from "@/components/dynamic-pricing-management"
import { ExtraServicesRequestsAdmin } from "@/components/extra-services-requests-admin"
import { NewsletterContactsAdmin } from "@/components/newsletter-contacts-admin"
import type { Booking, Room } from "@/lib/booking-utils"

interface BnBSettings {
  checkInTime: string
  checkOutTime: string
  cancellationPolicy: string
}

interface BookingCalendarFilteredProps {
  bookings: Booking[]
  roomId: string
  roomName: string
}

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminInner />
    </RequireAdmin>
  )
}

function AdminInner() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [bnbSettings, setBnbSettings] = useState<BnBSettings>({
    checkInTime: "15:00",
    checkOutTime: "11:00",
    cancellationPolicy: "free24h",
  })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    let unsubB: (() => void) | null = null
    let unsubR: (() => void) | null = null

    try {
      const qb = query(collection(db, "bookings"), orderBy("checkIn", "asc"))
      unsubB = onSnapshot(
        qb,
        (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any)),
        (error) => {
          console.error("[v0] Error fetching bookings:", error)
        },
      )

      unsubR = onSnapshot(
        collection(db, "rooms"),
        (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any)),
        (error) => {
          console.error("[v0] Error fetching rooms:", error)
        },
      )
    } catch (error) {
      console.error("[v0] Error setting up Firestore listeners:", error)
    }

    return () => {
      if (unsubB) {
        try {
          unsubB()
        } catch (error) {
          console.error("[v0] Error unsubscribing from bookings:", error)
        }
      }
      if (unsubR) {
        try {
          unsubR()
        } catch (error) {
          console.error("[v0] Error unsubscribing from rooms:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "bnb"))
        if (settingsDoc.exists()) {
          setBnbSettings(settingsDoc.data() as BnBSettings)
        }
      } catch (error) {
        console.error("[v0] Error loading settings:", error)
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id)
    }
  }, [rooms, selectedRoomId])

  const today = new Date().toISOString().split("T")[0]
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)
  const currentAndUpcoming = bookings.filter((b) => b.checkOut >= today && b.status !== "cancelled")
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled")
  const recent = currentAndUpcoming.slice(0, 5)
  const bookingComBookings = currentAndUpcoming.filter((b) => b.origin === "booking")
  const airbnbBookings = currentAndUpcoming.filter((b) => b.origin === "airbnb")
  const expediaBookings = currentAndUpcoming.filter((b) => b.origin === "expedia")
  const siteAndDirectBookings = currentAndUpcoming.filter((b) => b.origin === "site" || b.origin === "direct")

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      await setDoc(doc(db, "settings", "bnb"), bnbSettings)
      alert("Impostazioni salvate con successo!")
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      alert("Errore nel salvataggio delle impostazioni")
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard Amministratore</h1>
              <p className="text-muted-foreground">Gestisci prenotazioni, stanze e servizi</p>
            </div>
            <Button asChild variant="outline">
              <a href="/admin/payments-test" className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Test Pagamenti
              </a>
            </Button>
          </div>
          <Tabs defaultValue="dashboard" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto gap-1 p-1">
              <TabsTrigger value="dashboard" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Prenotazioni</span>
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Camere</span>
              </TabsTrigger>
              <TabsTrigger value="guests" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Ospiti</span>
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <ContactRound className="h-4 w-4" />
                <span className="hidden sm:inline">Contatti</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Euro className="h-4 w-4" />
                <span className="hidden sm:inline">Prezzi</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Servizi</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Impostazioni</span>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Cancellate</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Prenotazioni Totali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{currentAndUpcoming.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Correnti e future</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white text-xs">Booking.com</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{bookingComBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Da Booking.com</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-pink-600 text-white text-xs">Airbnb</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{airbnbBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Da Airbnb</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-yellow-600 text-white text-xs">Expedia</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{expediaBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Da Expedia</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className="bg-[#c9a84c] text-white text-xs">Sito / Dirette</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{siteAndDirectBookings.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Dal sito web e dirette</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Prenotazioni Recenti</CardTitle>
                    <CardDescription>Ultime 5 prenotazioni correnti/future</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessuna prenotazione corrente o futura</p>
                      ) : (
                        recent.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {b.guestFirst || b.firstName || "Nome"} {b.guestLast || b.lastName || "non disponibile"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {b.roomName} â€¢ {formatDate(b.checkIn)} â†’ {formatDate(b.checkOut)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-2">
                              <Badge
                                className={`text-xs text-white ${
                                  b.origin === "booking"
                                    ? "bg-blue-600"
                                    : b.origin === "airbnb"
                                      ? "bg-pink-600"
                                      : b.origin === "expedia"
                                        ? "bg-yellow-600"
                                        : "bg-[#c9a84c]"
                                }`}
                              >
                                {b.origin === "direct" ? "Diretta" : b.origin}
                              </Badge>
                              <p className="text-sm font-medium">â‚¬{b.total || (b as any).totalAmount || "0"}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stato Camere</CardTitle>
                    <CardDescription>Stato attuale delle camere</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {rooms.ãM½¶‰žËkºwµç@€€€€€€€€€€€€€€€€€€€€€€€€€€ñ	…‘”±…ÍÍ9…µ”ô‰Ñ•áÐµáÌˆûŠ
±íˆ¹Ñ½Ñ…°ñð€¡ˆ…Ì…¹ä¤¹Ñ½Ñ…±µ½Õ¹Ðñð€ˆÀ‰ôð½	…‘”ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à™±•àµ½°Í´é™±•àµÉ½ÜÍ´é¥Ñ•µÌµ•¹Ñ•È…À´ÄÍ´é…À´ÐÑ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰ÑÉÕ¹…Ñ”ˆùíˆ¹É½½µ9…µ•ôð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÍ´éÑ•áÐµÍ´ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€í™½Éµ…Ñ…Ñ”¡ˆ¹¡•­%¸¥ôƒŠHí™½Éµ…Ñ…Ñ”¡ˆ¹¡•­=ÕÐ¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€¤¤4(€€€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(4(€€€€€€€€€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰Í¥Ñ”ˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´Ìˆø4(€€€€€€€€€€€€€€€€€€€€€íÍ¥Ñ•¹‘¥É•Ñ	½½­¥¹Ì¹±•¹Ñ €ôôô€À€ü€ 4(€€€€€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆù9•ÍÍÕ¹„ÁÉ•¹½Ñ…é¥½¹”‘…°Í¥Ñ¼Ý•ˆ¼‘¥É•ÑÑ„ð½Àø4(€€€€€€€€€€€€€€€€€€€€€€¤€è€ 4(€€€€€€€€€€€€€€€€€€€€€€€Í¥Ñ•¹‘¥É•Ñ	½½­¥¹Ì¹µ…À ¡ˆ¤€ôø€ 4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€­•äõíˆ¹¥‘ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à™±•àµ½°…À´ÈÀ´ÌÍ´éÀ´Ð‰½É‘•ÈÉ½Õ¹‘•µ±œ¡½Ù•Èé‰œµµÕÑ•¼ÌÀÑÉ…¹Í¥Ñ¥½¸µ½±½ÉÌˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµÍÑ…ÉÐ©ÕÍÑ¥™äµ‰•ÑÝ••¸…À´Èˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à´Äµ¥¸µÜ´Àˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰™½¹Ðµµ•‘¥Õ´ÑÉÕ¹…Ñ”ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹Õ•ÍÑ¥ÉÍÐñð€¡ˆ…Ì…¹ä¤¹™¥ÉÍÑ9…µ”ñð€‰9½µ”¹½¸‘¥ÍÁ½¹¥‰¥±”‰õìˆ€‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹Õ•ÍÑ1…ÍÐñð€¡ˆ…Ì…¹ä¤¹±…ÍÑ9…µ”ñð€ˆ‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ÑÉÕ¹…Ñ”ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹•µ…¥±ôƒŠˆíˆ¹Á¡½¹•ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à…À´È™±•àµÍ¡É¥¹¬´Àˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ	…‘”±…ÍÍ9…µ”ô‰‰œµlŒå„àÑtÑ•áÐµÝ¡¥Ñ”Ñ•áÐµáÌˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹½É¥¥¸€ôôô€‰‘¥É•Ðˆ€ü€‰¥É•ÑÑ„ˆ€è€‰M¥Ñ¼]•ˆ‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½	…‘”ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ	…‘”±…ÍÍ9…µ”ô‰Ñ•áÐµáÌˆûŠ
±íˆ¹Ñ½Ñ…°ñð€¡ˆ…Ì…¹ä¤¹Ñ½Ñ…±µ½Õ¹Ðñð€ˆÀ‰ôð½	…‘”ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à™±•àµ½°Í´é™±•àµÉ½ÜÍ´é¥Ñ•µÌµ•¹Ñ•È…À´ÄÍ´é…À´ÐÑ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰ÑÉÕ¹…Ñ”ˆùíˆ¹É½½µ9…µ•ôð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÍ´éÑ•áÐµÍ´ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€í™½Éµ…Ñ…Ñ”¡ˆ¹¡•­%¸¥ôƒŠHí™½Éµ…Ñ…Ñ”¡ˆ¹¡•­=ÕÐ¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹Í•ÉÙ¥•Ì€˜˜ˆ¹Í•ÉÙ¥•Ì¹±•¹Ñ €ø€À€˜˜€ 4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÁÉ¥µ…Éäˆø¬íˆ¹Í•ÉÙ¥•Ì¹©½¥¸ ˆ°€ˆ¥ôð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€¤¤4(€€€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(4(€€€€€€€€€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰…¹•±±•ˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´Ìˆø4(€€€€€€€€€€€€€€€€€€€€€í…¹•±±•‘	½½­¥¹Ì¹±•¹Ñ €ôôô€À€ü€ 4(€€€€€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆù9•ÍÍÕ¹„ÁÉ•¹½Ñ…é¥½¹”…¹•±±…Ñ„ð½Àø4(€€€€€€€€€€€€€€€€€€€€€€¤€è€ 4(€€€€€€€€€€€€€€€€€€€€€€€…¹•±±•‘	½½­¥¹Ì¹µ…À ¡ˆ¤€ôø€ 4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€­•äõíˆ¹¥‘ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à™±•àµ½°…À´ÈÀ´ÌÍ´éÀ´Ð‰½É‘•È‰½É‘•Èµ‘•ÍÑÉÕÑ¥Ù”¼ÌÀÉ½Õ¹‘•µ±œ‰œµ‘•ÍÑÉÕÑ¥Ù”¼Ô¡½Ù•Èé‰œµ‘•ÍÑÉÕÑ¥Ù”¼ÄÀÑÉ…¹Í¥Ñ¥½¸µ½±½ÉÌˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à¥Ñ•µÌµÍÑ…ÉÐ©ÕÍÑ¥™äµ‰•ÑÝ••¸…À´Èˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à´Äµ¥¸µÜ´Àˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰™½¹Ðµµ•‘¥Õ´ÑÉÕ¹…Ñ”ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹™¥ÉÍÑ9…µ”ñðˆ¹Õ•ÍÑ¥ÉÍÐñð€‰9½µ”¹½¸‘¥ÍÁ½¹¥‰¥±”‰õìˆ€‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹±…ÍÑ9…µ”ñðˆ¹Õ•ÍÑ1…ÍÐñð€ˆ‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ÑÉÕ¹…Ñ”ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹•µ…¥±ôƒŠˆíˆ¹Á¡½¹•ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½Àø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à…À´È™±•àµÍ¡É¥¹¬´À™±•àµÝÉ…Àˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ	…‘”Ù…É¥…¹Ðô‰‘•ÍÑÉÕÑ¥Ù”ˆ±…ÍÍ9…µ”ô‰Ñ•áÐµáÌˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€911Q4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½	…‘”ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ	…‘”4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”õíÑ•áÐµáÌÑ•áÐµÝ¡¥Ñ”€‘ì4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ˆ¹½É¥¥¸€ôôô€‰‰½½­¥¹œˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ü€‰‰œµ‰±Õ”´ØÀÀˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€èˆ¹½É¥¥¸€ôôô€‰…¥É‰¹ˆˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ü€‰‰œµÁ¥¹¬´ØÀÀˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€èˆ¹½É¥¥¸€ôôô€‰•áÁ•‘¥„ˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ü€‰‰œµå•±±½Ü´ØÀÀˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€è€‰‰œµlŒå„àÑtˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€õô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹½É¥¥¸€ôôô€‰‘¥É•Ðˆ€ü€‰¥É•ÑÑ„ˆ€èˆ¹½É¥¥¹ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½	…‘”ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ	…‘”±…ÍÍ9…µ”ô‰Ñ•áÐµáÌ±¥¹”µÑ¡É½Õ ˆûŠ
±ì¡ˆ…Ì…¹ä¤¹Ñ½Ñ…±µ½Õ¹Ðñðˆ¹Ñ½Ñ…°ñð€ˆÀ‰ôð½	…‘”ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à™±•àµ½°Í´é™±•àµÉ½ÜÍ´é¥Ñ•µÌµ•¹Ñ•È…À´ÄÍ´é…À´ÐÑ•áÐµÍ´Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰ÑÉÕ¹…Ñ”ˆùíˆ¹É½½µ9…µ•ôð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÍ´éÑ•áÐµÍ´ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€í™½Éµ…Ñ…Ñ”¡ˆ¹¡•­%¸¥ôƒŠHí™½Éµ…Ñ…Ñ”¡ˆ¹¡•­=ÕÐ¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹É•™Õ¹‘µ½Õ¹Ð€„ôôÕ¹‘•™¥¹•€˜˜ˆ¹É•™Õ¹‘µ½Õ¹Ð€ø€À€˜˜€ 4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµÉ••¸´ØÀÀ™½¹ÐµÍ•µ¥‰½±ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€I¥µ‰½ÉÍ¼‘„•±…‰½É…É”èƒŠ
±í9Õµ‰•È¹Á…ÉÍ•±½…Ð¡ˆ¹É•™Õ¹‘µ½Õ¹Ð¹Ñ½MÑÉ¥¹œ ¤¤¹Ñ½¥á• È¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹Á•¹…±Ñä€„ôôÕ¹‘•™¥¹•€˜˜ˆ¹Á•¹…±Ñä€ø€À€˜˜€ 4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµ‘•ÍÑÉÕÑ¥Ù”™½¹ÐµÍ•µ¥‰½±ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€A•¹…±”…ÁÁ±¥…Ñ„èƒŠ
±í9Õµ‰•È¹Á…ÉÍ•±½…Ð¡ˆ¹Á•¹…±Ñä¹Ñ½MÑÉ¥¹œ ¤¤¹Ñ½¥á• È¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ•áÐµáÌÑ•áÐµµÕÑ•µ™½É•É½Õ¹ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€…¹•±±…Ñ„¥°éìˆ€‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€íˆ¹…¹•±±•‘Ð€ü¹•Ü…Ñ”¡ˆ¹…¹•±±•‘Ð¹Ñ½…Ñ” ¤¤¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ ‰¥Ðµ%Pˆ¤€è€‰8½‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€¤¤4(€€€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€€€€€ð½Q…‰Ìø4(€€€€€€€€€€€€€€€€ð½…É‘½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€ð½…Éø4(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(4(€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰É½½µÌˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÍ´éÍÁ…”µä´Øˆø4(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É¥É¥µ½±Ì´Ä±œéÉ¥µ½±Ì´È…À´ÐÍ´é…À´Øˆø4(€€€€€€€€€€€€€€€íÉ½½µÌ¹µ…À ¡É½½´¤€ôø€ 4(€€€€€€€€€€€€€€€€€€ñI½½µMÑ…ÑÕÍQ½±”­•äõíÉ½½´¹¥‘ôÉ½½´õíÉ½½µô€¼ø4(€€€€€€€€€€€€€€€€¤¥ô4(€€€€€€€€€€€€€€ð½‘¥Øø4(4(€€€€€€€€€€€€€€ñ…Éø4(€€€€€€€€€€€€€€€€ñ…É‘!•…‘•Èø4(€€€€€€€€€€€€€€€€€€ñ…É‘Q¥Ñ±”±…ÍÍ9…µ”ô‰™½¹Ðµ¥¹é•°Ñ•áÐµÁÉ¥µ…Éäˆù…±•¹‘…É¥¼…µ•É”ð½…É‘Q¥Ñ±”ø4(€€€€€€€€€€€€€€€€€€ñ…É‘•ÍÉ¥ÁÑ¥½¸ùY¥ÍÕ…±¥éé„±”ÁÉ•¹½Ñ…é¥½¹¤Á•È…µ•É„ð½…É‘•ÍÉ¥ÁÑ¥½¸ø4(€€€€€€€€€€€€€€€€ð½…É‘!•…‘•Èø4(€€€€€€€€€€€€€€€€ñ…É‘½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÁ…”µä´Ðˆø4(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰™±•à…À´È™±•àµÝÉ…Àˆø4(€€€€€€€€€€€€€€€€€€€€€€ñ	ÕÑÑ½¸4(€€€€€€€€€€€€€€€€€€€€€€€Ù…É¥…¹ÐõíÍ•±•Ñ•‘I½½µ%€ôôô¹Õ±°€ü€‰‘•™…Õ±Ðˆ€è€‰½ÕÑ±¥¹”‰ô4(€€€€€€€€€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑM•±•Ñ•‘I½½µ%¡¹Õ±°¥ô4(€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à´ÄÍ´é™±•àµ¹½¹”ˆ4(€€€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€€€QÕÑÑ”±”…µ•É”4(€€€€€€€€€€€€€€€€€€€€€€ð½	ÕÑÑ½¸ø4(€€€€€€€€€€€€€€€€€€€€€íÉ½½µÌ¹µ…À ¡É½½´¤€ôø€ 4(€€€€€€€€€€€€€€€€€€€€€€€€ñ	ÕÑÑ½¸4(€€€€€€€€€€€€€€€€€€€€€€€€€­•äõíÉ½½´¹¥‘ô4(€€€€€€€€€€€€€€€€€€€€€€€€€Ù…É¥…¹ÐõíÍ•±•Ñ•‘I½½µ%€ôôôÉ½½´¹¥€ü€‰‘•™…Õ±Ðˆ€è€‰½ÕÑ±¥¹”‰ô4(€€€€€€€€€€€€€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøÍ•ÑM•±•Ñ•‘I½½µ%¡É½½´¹¥¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰™±•à´ÄÍ´é™±•àµ¹½¹”ˆ4(€€€€€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€€€€€íÉ½½´¹¹…µ•ô4(€€€€€€€€€€€€€€€€€€€€€€€€ð½	ÕÑÑ½¸ø4(€€€€€€€€€€€€€€€€€€€€€€¤¥ô4(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(4(€€€€€€€€€€€€€€€€€€€íÍ•±•Ñ•‘I½½µ%€˜˜Í•±•Ñ•‘I½½´€ü€ 4(€€€€€€€€€€€€€€€€€€€€€€ñ	½½­¥¹…±•¹‘…É¥±Ñ•É•4(€€€€€€€€€€€€€€€€€€€€€€€‰½½­¥¹Ìõí‰½½­¥¹Íô4(€€€€€€€€€€€€€€€€€€€€€€€É½½µ%õíÍ•±•Ñ•‘I½½µ%‘ô4(€€€€€€€€€€€€€€€€€€€€€€€É½½µ9…µ”õíÍ•±•Ñ•‘I½½´¹¹…µ•ô4(€€€€€€€€€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€€€€€€€€€¤€è€ 4(€€€€€€€€€€€€€€€€€€€€€€ñ	½½­¥¹…±•¹‘…È€¼ø4(€€€€€€€€€€€€€€€€€€€€¥ô4(€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€ð½…É‘½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€ð½…Éø4(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(4(€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰Õ•ÍÑÌˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÍ´éÍÁ…”µä´Øˆø(€€€€€€€€€€€€€€ñÕ•ÍÑÍQÉ…­¥¹œ€¼ø(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø((€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰½¹Ñ…ÑÌˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÍ´éÍÁ…”µä´Øˆø(€€€€€€€€€€€€€€ñ9•ÝÍ±•ÑÑ•É½¹Ñ…ÑÍ‘µ¥¸€¼ø(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø(4(€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰ÁÉ¥¥¹œˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÍ´éÍÁ…”µä´Øˆø4(€€€€€€€€€€€€€€ñå¹…µ¥AÉ¥¥¹5…¹…•µ•¹Ð€¼ø4(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(4(€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰Í•ÉÙ¥•Ìˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÍ´éÍÁ…”µä´Øˆø4(€€€€€€€€€€€€€€ñáÑÉ…M•ÉÙ¥•ÍI•ÅÕ•ÍÑÍ‘µ¥¸€¼ø4(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(4(€€€€€€€€€€€€ñQ…‰Í½¹Ñ•¹ÐÙ…±Õ”ô‰Í•ÑÑ¥¹Ìˆ±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÍ´éÍÁ…”µä´Øˆø4(€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É¥É¥µ½±Ì´Ä±œéÉ¥µ½±Ì´È…À´ÐÍ´é…À´Øˆø4(€€€€€€€€€€€€€€€€ñMµ½½‰ÕMå¹A…¹•°€¼ø4(€€€€€€€€€€€€€€€€ñMµ½½‰ÕI•Ù¥•ÝÍMå¹Œ€¼ø4(€€€€€€€€€€€€€€ð½‘¥Øø4(4(€€€€€€€€€€€€€€ñ	½½­¥¹	±½­…Ñ•Ì€¼ø4(4(€€€€€€€€€€€€€€ñ‘µ¥¹M•ÕÉ¥ÑåM•ÑÑ¥¹Ì€¼ø4(4(€€€€€€€€€€€€€€ñ…Éø4(€€€€€€€€€€€€€€€€ñ…É‘!•…‘•Èø4(€€€€€€€€€€€€€€€€€€ñ…É‘Q¥Ñ±”±…ÍÍ9…µ”ô‰™½¹Ðµ¥¹é•°Ñ•áÐµÁÉ¥µ…Éäˆù%µÁ½ÍÑ…é¥½¹¤™ð½…É‘Q¥Ñ±”ø4(€€€€€€€€€€€€€€€€€€ñ…É‘•ÍÉ¥ÁÑ¥½¸ù½¹™¥ÕÉ„±”¥µÁ½ÍÑ…é¥½¹¤‘¥¹…µ¥¡”‘•°™ð½…É‘•ÍÉ¥ÁÑ¥½¸ø4(€€€€€€€€€€€€€€€€ð½…É‘!•…‘•Èø4(€€€€€€€€€€€€€€€€ñ…É‘½¹Ñ•¹Ð±…ÍÍ9…µ”ô‰ÍÁ…”µä´Øˆø4(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÁ…”µä´ÐÁˆ´Ø‰½É‘•Èµˆˆø4(€€€€€€€€€€€€€€€€€€€€ñ Ì±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆù%¹™½Éµ…é¥½¹¤¥ÍÍ”ð½ Ìø4(€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°±…ÍÍ9…µ”ô‰Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆù9½µ”€¡™¥ÍÍ¼¤ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€ñ%¹ÁÕÐ4(€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µÐ´È‰œµµÕÑ•¼ÔÀÕÉÍ½Èµ¹½Ðµ…±±½Ý•ˆ4(€€€€€€€€€€€€€€€€€€€€€€€Ù…±Õ”ô‰0€ÈÈMÕ¥Ñ”€˜MA1UaUIdaAI%9ˆ4(€€€€€€€€€€€€€€€€€€€€€€€‘¥Í…‰±•4(€€€€€€€€€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É¥É¥µ½±Ì´ÄÍ´éÉ¥µ½±Ì´È…À´Ðˆø4(€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°±…ÍÍ9…µ”ô‰Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆù%¹‘¥É¥éé¼ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ%¹ÁÕÐ±…ÍÍ9…µ”ô‰µÐ´È‰œµµÕÑ•¼ÔÀÕÉÍ½Èµ¹½Ðµ…±±½Ý•ˆÙ…±Õ”ô‰Y¥¼•±Í¼$¸€ÈÈˆ‘¥Í…‰±•€¼ø4(€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°±…ÍÍ9…µ”ô‰Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆùQ•±•™½¹¼ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ%¹ÁÕÐ±…ÍÍ9…µ”ô‰µÐ´È‰œµµÕÑ•¼ÔÀÕÉÍ½Èµ¹½Ðµ…±±½Ý•ˆÙ…±Õ”ôˆ¬Ìä€ÌÜÔ€ÜÀÄ€ÜØàäˆ‘¥Í…‰±•€¼ø4(€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°±…ÍÍ9…µ”ô‰Ñ•áÐµµÕÑ•µ™½É•É½Õ¹ˆùµ…¥°ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€ñ%¹ÁÕÐ±…ÍÍ9…µ”ô‰µÐ´È‰œµµÕÑ•¼ÔÀÕÉÍ½Èµ¹½Ðµ…±±½Ý•ˆÙ…±Õ”ô‰ÁÉ½•Ñ±½…±•µ…¥°¹½´ˆ‘¥Í…‰±•€¼ø4(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(4(€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÁ…”µä´Ðˆø4(€€€€€€€€€€€€€€€€€€€€ñ Ì±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹ÐµÍ•µ¥‰½±Ñ•áÐµÁÉ¥µ…Éäˆù%µÁ½ÍÑ…é¥½¹¤¥¹…µ¥¡”ð½ Ìø4(€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É¥É¥µ½±Ì´ÄÍ´éÉ¥µ½±Ì´È…À´Ðˆø4(€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°¡Ñµ±½Èô‰¡•­%¸ˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñ±½¬±…ÍÍ9…µ”ô‰Ü´Ð ´Ð¥¹±¥¹”µÈ´Èˆ€¼ø4(€€€€€€€€€€€€€€€€€€€€€€€€€¡•¬µ¥¸4(€€€€€€€€€€€€€€€€€€€€€€€€ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ%¹ÁÕÐ4(€€€€€€€€€€€€€€€€€€€€€€€€€¥ô‰¡•­%¸ˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€ÑåÁ”ô‰Ñ¥µ”ˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µÐ´Èˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€Ù…±Õ”õí‰¹‰M•ÑÑ¥¹Ì¹¡•­%¹Q¥µ•ô4(€€€€€€€€€€€€€€€€€€€€€€€€€½¹¡…¹”õì¡”¤€ôøÍ•Ñ	¹‰M•ÑÑ¥¹Ì¡ì€¸¸¹‰¹‰M•ÑÑ¥¹Ì°¡•­%¹Q¥µ”è”¹Ñ…É•Ð¹Ù…±Õ”ô¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°¡Ñµ±½Èô‰¡•­=ÕÐˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñ±½¬±…ÍÍ9…µ”ô‰Ü´Ð ´Ð¥¹±¥¹”µÈ´Èˆ€¼ø4(€€€€€€€€€€€€€€€€€€€€€€€€€¡•¬µ½ÕÐ4(€€€€€€€€€€€€€€€€€€€€€€€€ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€€€ñ%¹ÁÕÐ4(€€€€€€€€€€€€€€€€€€€€€€€€€¥ô‰¡•­=ÕÐˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€ÑåÁ”ô‰Ñ¥µ”ˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰µÐ´Èˆ4(€€€€€€€€€€€€€€€€€€€€€€€€€Ù…±Õ”õí‰¹‰M•ÑÑ¥¹Ì¹¡•­=ÕÑQ¥µ•ô4(€€€€€€€€€€€€€€€€€€€€€€€€€½¹¡…¹”õì¡”¤€ôøÍ•Ñ	¹‰M•ÑÑ¥¹Ì¡ì€¸¸¹‰¹‰M•ÑÑ¥¹Ì°¡•­=ÕÑQ¥µ”è”¹Ñ…É•Ð¹Ù…±Õ”ô¥ô4(€€€€€€€€€€€€€€€€€€€€€€€€¼ø4(€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€ñ‘¥Øø4(€€€€€€€€€€€€€€€€€€€€€€ñ1…‰•°¡Ñµ±½Èô‰…¹•±±…Ñ¥½¸ˆùA½±¥Ñ¥„‘¤…¹•±±…é¥½¹”ð½1…‰•°ø4(€€€€€€€€€€€€€€€€€€€€€€ñM•±•Ð4(€€€€€€€€€€€€€€€€€€€€€€€Ù…±Õ”õí‰¹‰M•ÑÑ¥¹Ì¹…¹•±±…Ñ¥½¹A½±¥åô4(€€€€€€€€€€€€€€€€€€€€€€€½¹Y…±Õ•¡…¹”õì¡Ù…±Õ”¤€ôøÍ•Ñ	¹‰M•ÑÑ¥¹Ì¡ì€¸¸¹‰¹‰M•ÑÑ¥¹Ì°…¹•±±…Ñ¥½¹A½±¥äèÙ…±Õ”ô¥ô4(€€€€€€€€€€€€€€€€€€€€€€ø4(€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•ÑQÉ¥•È¥ô‰…¹•±±…Ñ¥½¸ˆ±…ÍÍ9…µ”ô‰µÐ´Èˆø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•ÑY…±Õ”€¼ø4(€€€€€€€€€€€€€€€€€€€€€€€€ð½M•±•ÑQÉ¥•Èø4(€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•Ñ½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•Ñ%Ñ•´Ù…±Õ”ô‰™É•”ÈÑ ˆù…¹•±±…é¥½¹”É…ÑÕ¥Ñ„™¥¹¼„€ÈÑ ð½M•±•Ñ%Ñ•´ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•Ñ%Ñ•´Ù…±Õ”ô‰™É•”Ðá ˆù…¹•±±…é¥½¹”É…ÑÕ¥Ñ„™¥¹¼„€Ðá ð½M•±•Ñ%Ñ•´ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•Ñ%Ñ•´Ù…±Õ”ô‰™É•”Ý‘…åÌˆù…¹•±±…é¥½¹”É…ÑÕ¥Ñ„™¥¹¼„€Ü¥½É¹¤ð½M•±•Ñ%Ñ•´ø4(€€€€€€€€€€€€€€€€€€€€€€€€€€ñM•±•Ñ%Ñ•´Ù…±Õ”ô‰¹½¹I•™Õ¹‘…‰±”ˆù9½¸É¥µ‰½ÉÍ…‰¥±”ð½M•±•Ñ%Ñ•´ø4(€€€€€€€€€€€€€€€€€€€€€€€€ð½M•±•Ñ½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€€€€€€€€€ð½M•±•Ðø4(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€€€€€ñ	ÕÑÑ½¸½¹±¥¬õíÍ…Ù•M•ÑÑ¥¹Íô‘¥Í…‰±•õíÍ…Ù¥¹M•ÑÑ¥¹Íô±…ÍÍ9…µ”ô‰Üµ™Õ±°Í´éÜµ…ÕÑ¼ˆø4(€€€€€€€€€€€€€€€€€€€€€íÍ…Ù¥¹M•ÑÑ¥¹Ì€ü€‰M…±Ù…Ñ…¥¼¸¸¸ˆ€è€‰M…±Ù„%µÁ½ÍÑ…é¥½¹¤‰ô4(€€€€€€€€€€€€€€€€€€€€ð½	ÕÑÑ½¸ø4(€€€€€€€€€€€€€€€€€€ð½‘¥Øø4(€€€€€€€€€€€€€€€€ð½…É‘½¹Ñ•¹Ðø4(€€€€€€€€€€€€€€ð½…Éø4(€€€€€€€€€€€€ð½Q…‰Í½¹Ñ•¹Ðø4(€€€€€€€€€€ð½Q…‰Ìø4(€€€€€€€€ð½‘¥Øø4(€€€€€€ð½‘¥Øø4(€€€€€€ñ½½Ñ•È€¼ø4(€€€€ð½µ…¥¸ø4(€€¤4)ô4(4(