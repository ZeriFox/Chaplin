"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserCheck, UserX, Calendar, Mail, Phone, Home } from 'lucide-react'
import { db } from "@/lib/firebase"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore"
import type { Booking } from "@/lib/booking-utils"

export function GuestsTracking() {
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("checkIn", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[]
      setBookings(bookingsData)
    })

    return () => unsubscribe()
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTime = today.getTime()

  const currentGuests = bookings.filter((b) => {
    const status = String(b.status || "").toLowerCase()
    if (status !== "confirmed" && status !== "pending") return false
    const checkIn = new Date(b.checkIn)
    const checkOut = new Date(b.checkOut)
    checkIn.setHours(0, 0, 0, 0)
    checkOut.setHours(0, 0, 0, 0)
    return checkIn.getTime() <= todayTime && checkOut.getTime() > todayTime
  })

  const upcomingGuests = bookings.filter((b) => {
    const status = String(b.status || "").toLowerCase()
    if (status !== "confirmed" && status !== "pending") return false
    const checkIn = new Date(b.checkIn)
    checkIn.setHours(0, 0, 0, 0)
    return checkIn.getTime() > todayTime
  })

  const pastGuests = bookings.filter((b) => {
    const checkOut = new Date(b.checkOut)
    checkOut.setHours(0, 0, 0, 0)
    return checkOut.getTime() <= todayTime
  })

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

  const GuestCard = ({ booking, status }: { booking: Booking; status: "current" | "upcoming" | "past" }) => {
    const firstName = booking.guestFirst || (booking as any).firstName || "N/A"
    const lastName = booking.guestLast || (booking as any).lastName || ""
    const totalAmount = booking.total || (booking as any).totalAmount || 0
    
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-lg">
                  {firstName} {lastName}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`text-white ${
                      booking.origin === "booking"
                        ? "bg-blue-600"
                        : booking.origin === "airbnb"
                          ? "bg-pink-600"
                          : booking.origin === "expedia"
                            ? "bg-yellow-600"
                            : "bg-emerald-600"
                    }`}
                  >
                    {booking.origin === "direct" ? "Diretta" : booking.origin}
                  </Badge>
                  {status === "current" && <Badge className="bg-green-600">In Casa</Badge>}
                  {status === "upcoming" && <Badge className="bg-orange-600">In Arrivo</Badge>}
                  {status === "past" && <Badge variant="secondary">Passato</Badge>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="truncate">{booking.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{booking.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Home className="w-4 h-4" />
              <span className="truncate">{booking.roomName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
              </span>
            </div>
          </div>

          {booking.services && booking.services.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Servizi Aggiuntivi:</p>
              <div className="flex flex-wrap gap-1">
                {booking.services.map((service, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Totale: <strong className="text-foreground">€{totalAmount}</strong>
            </span>
            <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
              {booking.status === "confirmed" ? "Confermata" : booking.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" />
              Ospiti Attuali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentGuests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Ospiti in casa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              Ospiti in Arrivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingGuests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Prenotazioni future</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserX className="w-4 h-4 text-gray-600" />
              Ospiti Passati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pastGuests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Totale ospiti passati</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-cinzel text-primary">Gestione Ospiti</CardTitle>
          <CardDescription>Traccia tutti gli ospiti correnti, futuri e passati</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current">Attuali ({currentGuests.length})</TabsTrigger>
              <TabsTrigger value="upcoming">In Arrivo ({upcomingGuests.length})</TabsTrigger>
              <TabsTrigger value="past">Passati ({pastGuests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-3">
              {currentGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun ospite attuale</p>
                </div>
              ) : (
                currentGuests.map((booking) => <GuestCard key={booking.id} booking={booking} status="current" />)
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-3">
              {upcomingGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun ospite in arrivo</p>
                </div>
              ) : (
                upcomingGuests.map((booking) => <GuestCard key={booking.id} booking={booking} status="upcoming" />)
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3">
              {pastGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessun ospite passato</p>
                </div>
              ) : (
                pastGuests.map((booking) => <GuestCard key={booking.id} booking={booking} status="past" />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
