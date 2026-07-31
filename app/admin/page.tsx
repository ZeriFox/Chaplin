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
                                {b.roomName} • {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
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
                              <p className="text-sm font-medium">€{b.total || (b as any).totalAmount || "0"}</p>
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
                      {rooms.�M�����k�w��@���������������������������	����������9����ѕ�е�̈��
��툹ѽх���������́��䤹ѽх���չЁ��������	�����4(������������������������������𽑥��4(����������������������������𽑥��4(�����������������������������؁�����9���􉙱������്���ʹ陱��ɽ܁ʹ�ѕ�̵���ѕȁ����āʹ靅��Ёѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ���4(�����������������������������������������9������չ��є��툹ɽ��9����������4(�����������������������������������������9����ѕ�е�́ʹ�ѕ�еʹ��4(��������������������������������홽ɵ���є��������%���H�홽ɵ���є��������=�Х�4(������������������������������������4(����������������������������𽑥��4(��������������������������𽑥��4(��������������������������4(������������������������4(���������������������Q�����ѕ���4(4(���������������������Q�����ѕ�Ёم�Ք�ͥє�������9�����������̈�4(�����������������������ͥѕ���ɕ��	������̹����Ѡ���������4(��������������������������������9����ѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ���9���չ���ɕ��х饽�������ͥѼ�ݕ������ɕ�ф���4(������������������������耠4(������������������������ͥѕ���ɕ��	������̹������������4(����������������������������4(��������������������������������툹���4(���������������������������������9���􉙱������്�������ȁ��́ʹ���Ё��ɑ�ȁɽչ���������ٕ�鉜���ѕ������Ʌ�ͥѥ��������̈4(���������������������������4(�����������������������������؁�����9���􉙱����ѕ�̵�х�Ё���ѥ�䵉��ݕ�������Ȉ�4(�������������������������������؁�����9���􉙱��ā����ܴ���4(����������������������������������������9���􉙽�е����մ���չ��є��4(����������������������������������툹�Օ�����Ё�������́��䤹�����9��������9���������������������숀��4(����������������������������������툹�Օ��1��Ё�������́��䤹����9����������4(�����������������������������������4(����������������������������������������9����ѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ����չ��є��4(����������������������������������툹��������툹������4(�����������������������������������4(������������������������������𽑥��4(�������������������������������؁�����9���􉙱�������ȁ����͡ɥ������4(���������������������������������	����������9���􉉜�l����эt�ѕ�еݡ�є�ѕ�е�̈�4(����������������������������������툹�ɥ������􀉑�ɕ�Ј�����ɕ�ф��耉M�Ѽ�]����4(���������������������������������	�����4(���������������������������������	����������9����ѕ�е�̈��
�툹ѽх���������́��䤹ѽх���չЁ��������	�����4(������������������������������𽑥��4(����������������������������𽑥��4(�����������������������������؁�����9���􉙱������്���ʹ陱��ɽ܁ʹ�ѕ�̵���ѕȁ����āʹ靅��Ёѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ���4(�����������������������������������������9������չ��є��툹ɽ��9����������4(�����������������������������������������9����ѕ�е�́ʹ�ѕ�еʹ��4(��������������������������������홽ɵ���є��������%���H�홽ɵ���є��������=�Х�4(������������������������������������4(������������������������������툹͕�٥��̀�����͕�٥��̹����Ѡ���������4(�������������������������������������������9����ѕ�е�́ѕ�е�ɥ�������툹͕�٥��̹�����������������4(��������������������������������4(����������������������������𽑥��4(��������������������������𽑥��4(��������������������������4(������������������������4(���������������������Q�����ѕ���4(4(���������������������Q�����ѕ�Ёم�Ք􉍅��������������9�����������̈�4(����������������������퍅�������	������̹����Ѡ���������4(��������������������������������9������ѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ���9���չ���ɕ��х饽�����������ф���4(������������������������耠4(���������������������������������	������̹������������4(����������������������������4(��������������������������������툹���4(���������������������������������9���􉙱������്�������ȁ��́ʹ���Ё��ɑ�ȁ��ɑ�ȵ�����Սѥٔ����ɽչ���������������Սѥٔ�ԁ��ٕ�鉜������Սѥٔ�����Ʌ�ͥѥ��������̈4(���������������������������4(�����������������������������؁�����9���􉙱����ѕ�̵�х�Ё���ѥ�䵉��ݕ�������Ȉ�4(�������������������������������؁�����9���􉙱��ā����ܴ���4(����������������������������������������9���􉙽�е����մ���չ��є��4(����������������������������������툹�����9����������Օ�����Ё����9���������������������숀��4(����������������������������������툹����9����������Օ��1��Ё������4(�����������������������������������4(����������������������������������������9����ѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ����չ��є��4(����������������������������������툹��������툹������4(�����������������������������������4(������������������������������𽑥��4(�������������������������������؁�����9���􉙱�������ȁ����͡ɥ����������Ʌ���4(���������������������������������	�����مɥ���􉑕���Սѥٔ�������9����ѕ�е�̈�4(����������������������������������911Q4(���������������������������������	�����4(���������������������������������	����4(���������������������������������������9�����ѕ�е�́ѕ�еݡ�є���4(���������������������������������������ɥ������􀉉�������4(����������������������������������������������Ք�����4(��������������������������������������聈��ɥ������􀉅�ɉ���4(�������������������������������������������������������4(����������������������������������������聈��ɥ������􀉕�������4(������������������������������������������������啱��ܴ����4(������������������������������������������耉���l����эt�4(�������������������������������������4(���������������������������������4(����������������������������������툹�ɥ������􀉑�ɕ�Ј�����ɕ�ф��聈��ɥ����4(���������������������������������	�����4(���������������������������������	����������9����ѕ�е�́�����ѡɽ՝����
�졈��́��䤹ѽх���չЁ�����ѽх����������	�����4(������������������������������𽑥��4(����������������������������𽑥��4(�����������������������������؁�����9���􉙱������്���ʹ陱��ɽ܁ʹ�ѕ�̵���ѕȁ����āʹ靅��Ёѕ�еʹ�ѕ�е��ѕ����ɕ�ɽչ���4(�����������������������������������������9������չ��є��툹ɽ��9����������4(�����������������������������������������9����ѕ�е�́ʹ�ѕ�еʹ��4(��������������������������������홽ɵ���є��������%���H�홽ɵ���є��������=�Х�4(������������������������������������4(����������������������������𽑥��4(����������������������������툹ɕ�չ���չЀ���չ�������������ɕ�չ���չЀ��������4(�������������������������������؁�����9����ѕ�е�́ѕ�е�ɕ����������е͕��������4(��������������������������������I�����ͼ���������Ʌɔ胊
��9յ��ȹ���͕���С��ɕ�չ���չйѽM�ɥ������ѽ�ᕐ�ȥ�4(������������������������������𽑥��4(������������������������������4(����������������������������툹������䀄��չ������������������������������4(�������������������������������؁�����9����ѕ�е�́ѕ�е�����Սѥٔ�����е͕��������4(��������������������������������A�������������ф胊
��9յ��ȹ���͕���С���������ѽM�ɥ������ѽ�ᕐ�ȥ�4(������������������������������𽑥��4(������������������������������4(�����������������������������؁�����9����ѕ�е�́ѕ�е��ѕ����ɕ�ɽչ���4(�������������������������������������ф����숀��4(������������������������������툹���������Ѐ����܁�є������������йѽ�є����ѽ1������ѕM�ɥ�����е%P���耉8���4(����������������������������𽑥��4(��������������������������𽑥��4(��������������������������4(������������������������4(���������������������Q�����ѕ���4(�������������������Q����4(������������������ɑ��ѕ���4(����������������ɐ�4(�������������Q�����ѕ���4(4(�������������Q�����ѕ�Ёم�Ք�ɽ��̈������9�����������Ёʹ��������؈�4(���������������؁�����9����ɥ���ɥ�����̴ā���ɥ�����̴ȁ����Ёʹ靅��؈�4(�����������������ɽ��̹�����ɽ��������4(�������������������I���Mх���Q�����������ɽ������ɽ����ɽ����4(�������������������4(��������������𽑥��4(4(����������������ɐ�4(������������������ɑ!������4(��������������������ɑQ�ѱ�������9���􉙽�е���镰�ѕ�е�ɥ�����������ɥ�����ɔ��ɑQ�ѱ��4(��������������������ɑ�͍ɥ�ѥ���Y��Յ���鄁����ɕ��х饽�����ȁ����Ʉ��ɑ�͍ɥ�ѥ���4(������������������ɑ!������4(������������������ɑ��ѕ���4(�������������������؁�����9�����������Ј�4(���������������������؁�����9���􉙱�������ȁ�����Ʌ���4(�����������������������	��ѽ�4(������������������������مɥ�����͕���ѕ�I���%�����ձ���������ձЈ�耉��ѱ�����4(�������������������������������젤����͕�M����ѕ�I���%���ձ���4(�����������������������������9���􉙱��āʹ陱�൹����4(�����������������������4(������������������������Q��є�������ɔ4(�����������������������	��ѽ��4(�����������������������ɽ��̹�����ɽ��������4(�������������������������	��ѽ�4(�������������������������������ɽ������4(��������������������������مɥ�����͕���ѕ�I���%�����ɽ�������������ձЈ�耉��ѱ�����4(���������������������������������젤����͕�M����ѕ�I���%��ɽ�������4(�������������������������������9���􉙱��āʹ陱�൹����4(�������������������������4(���������������������������ɽ��������4(�������������������������	��ѽ��4(�������������������������4(��������������������𽑥��4(4(���������������������͕���ѕ�I���%�����͕���ѕ�I�������4(�����������������������	���������������ѕɕ�4(���������������������������������퉽�������4(������������������������ɽ��%���͕���ѕ�I���%��4(������������������������ɽ��9�����͕���ѕ�I���������4(������������������������4(����������������������耠4(�����������������������	������������Ȁ��4(����������������������4(������������������𽑥��4(������������������ɑ��ѕ���4(����������������ɐ�4(�������������Q�����ѕ���4(4(�������������Q�����ѕ�Ёم�Ք�Օ��̈������9�����������Ёʹ��������؈�(���������������Օ���QɅ��������(�������������Q�����ѕ���((�������������Q�����ѕ�Ёم�Ք􉍽�х��̈������9�����������Ёʹ��������؈�(���������������9��ͱ��ѕ���х����������(�������������Q�����ѕ���(4(�������������Q�����ѕ�Ёم�Ք��ɥ�����������9�����������Ёʹ��������؈�4(���������������幅���Aɥ����5��������Ѐ��4(�������������Q�����ѕ���4(4(�������������Q�����ѕ�Ёم�Ք�͕�٥��̈������9�����������Ёʹ��������؈�4(������������������ɅM��٥���I��Օ����������4(�������������Q�����ѕ���4(4(�������������Q�����ѕ�Ёم�Ք�͕�ѥ��̈������9�����������Ёʹ��������؈�4(���������������؁�����9����ɥ���ɥ�����̴ā���ɥ�����̴ȁ����Ёʹ靅��؈�4(�����������������M�����M幍A�������4(�����������������M�����I�٥���M幌���4(��������������𽑥��4(4(���������������	������	�����ѕ̀��4(4(�������������������M���ɥ��M��ѥ��̀��4(4(����������������ɐ�4(������������������ɑ!������4(��������������������ɑQ�ѱ�������9���􉙽�е���镰�ѕ�е�ɥ�����%����х饽������ɑQ�ѱ��4(��������������������ɑ�͍ɥ�ѥ���������Ʉ���������х饽��������������������ɑ�͍ɥ�ѥ���4(������������������ɑ!������4(������������������ɑ��ѕ�Ё�����9�����������؈�4(�������������������؁�����9�����������Ё���؁��ɑ�ȵ���4(���������������������́�����9����ѕ�еʹ����е͕�������ѕ�е��ѕ����ɕ�ɽչ���%���ɵ�饽�����͔���4(�����������������������4(�����������������������1����������9����ѕ�е��ѕ����ɕ�ɽչ���9��������ͼ��1�����4(�����������������������%����4(�����������������������������9����дȁ�����ѕ��������ͽȵ��е����ݕ��4(������������������������م�Ք�0��ȁMեє���MA�1UaUId�aAI%9�4(��������������������������ͅ����4(������������������������4(��������������������𽑥��4(���������������������؁�����9����ɥ���ɥ�����̴āʹ�ɥ�����̴ȁ����Ј�4(�������������������������4(�������������������������1����������9����ѕ�е��ѕ����ɕ�ɽչ���%���ɥ���1�����4(�������������������������%���Ё�����9����дȁ�����ѕ��������ͽȵ��е����ݕ���م�Ք�Y������ͼ�$����Ȉ���ͅ�������4(����������������������𽑥��4(�������������������������4(�������������������������1����������9����ѕ�е��ѕ����ɕ�ɽչ���Q��������1�����4(�������������������������%���Ё�����9����дȁ�����ѕ��������ͽȵ��е����ݕ���م�Ք�����Ԁ��Ā���䈁��ͅ�������4(����������������������𽑥��4(��������������������𽑥��4(�����������������������4(�����������������������1����������9����ѕ�е��ѕ����ɕ�ɽչ��������1�����4(�����������������������%���Ё�����9����дȁ�����ѕ��������ͽȵ��е����ݕ���م�Ք��ɽ��ѱ������������������ͅ�������4(��������������������𽑥��4(������������������𽑥��4(4(�������������������؁�����9�����������Ј�4(���������������������́�����9����ѕ�еʹ����е͕�������ѕ�е�ɥ�����%����х饽��������������4(���������������������؁�����9����ɥ���ɥ�����̴āʹ�ɥ�����̴ȁ����Ј�4(�������������������������4(�������������������������1������ѵ���􉍡���%���4(�������������������������������������9����ܴЁ��Ё��������ȴȈ���4(���������������������������������4(�������������������������1�����4(�������������������������%����4(����������������������������􉍡���%��4(�������������������������������ѥ���4(�������������������������������9����дȈ4(��������������������������م�Ք�퉹�M��ѥ��̹�����%�Q����4(����������������������������������졔�����͕�	��M��ѥ��̡쀸�����M��ѥ��̰������%�Q���联�хɝ�йم�Ք����4(��������������������������4(����������������������𽑥��4(�������������������������4(�������������������������1������ѵ���􉍡���=�Ј�4(�������������������������������������9����ܴЁ��Ё��������ȴȈ���4(����������������������������������4(�������������������������1�����4(�������������������������%����4(����������������������������􉍡���=�Ј4(��������������������������������ѥ���4(�������������������������������9����дȈ4(��������������������������م�Ք�퉹�M��ѥ��̹�����=��Q����4(����������������������������������졔�����͕�	��M��ѥ��̡쀸�����M��ѥ��̰������=��Q���联�хɝ�йم�Ք����4(��������������������������4(����������������������𽑥��4(��������������������𽑥��4(�����������������������4(�����������������������1������ѵ���􉍅������ѥ����A���ѥ�������������饽���1�����4(�����������������������M�����4(������������������������م�Ք�퉹�M��ѥ��̹��������ѥ��A������4(��������������������������Y��Օ�������م�Ք�����͕�	��M��ѥ��̡쀸�����M��ѥ��̰���������ѥ��A������م�Ք����4(�����������������������4(�������������������������M�����Qɥ���ȁ��􉍅������ѥ���������9����дȈ�4(���������������������������M�����Y��Ք���4(�������������������������M�����Qɥ�����4(�������������������������M�������ѕ���4(���������������������������M�����%ѕ��م�Ք�ɕ��Ѡ���������饽����Ʌ�եф���������Ѡ�M�����%ѕ��4(���������������������������M�����%ѕ��م�Ք�ɕ��᠈��������饽����Ʌ�եф�����������M�����%ѕ��4(���������������������������M�����%ѕ��م�Ք�ɕ�ݑ��̈��������饽����Ʌ�եф��������܁���ɹ��M�����%ѕ��4(���������������������������M�����%ѕ��م�Ք􉹽�I��չ�������9���ɥ����ͅ�����M�����%ѕ��4(�������������������������M�������ѕ���4(�����������������������M������4(��������������������𽑥��4(���������������������	��ѽ����������ٕͅM��ѥ���􁑥ͅ������ͅ٥��M��ѥ���􁍱���9����ܵ�ձ��ʹ�ܵ��Ѽ��4(�����������������������ͅ٥��M��ѥ��̀���M��مх���������耉M��ل�%����х饽����4(���������������������	��ѽ��4(������������������𽑥��4(������������������ɑ��ѕ���4(����������������ɐ�4(�������������Q�����ѕ���4(�����������Q����4(��������𽑥��4(������𽑥��4(���������ѕȀ��4(����𽵅���4(���4)�4(4(