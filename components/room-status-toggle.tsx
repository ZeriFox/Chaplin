"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, Wrench, CheckCircle } from 'lucide-react'
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot ,doc, updateDoc } from "firebase/firestore"
import type { Room } from "@/lib/booking-utils"

interface RoomStatusToggleProps {
  room: Room
}

type RoomStatus = "available" | "booked" | "maintenance"

type RoomType = "balcony" | "spa" | "other"

const getRoomType = (room: Room): RoomType => {
  const name = (room.name || "").toLowerCase()

  if (name.includes("balcone") || name.includes("familiare")) {
    return "balcony"
  }

  if (name.includes("vasca") || name.includes("idromassaggio") || name.includes("suite")) {
    return "spa"
  }

  return "other"
}

export function RoomStatusToggle({ room }: RoomStatusToggleProps) {
  const [currentStatus, setCurrentStatus] = useState<RoomStatus>(room.status)
  const roomType = getRoomType(room)

  useEffect(() => {
    let bookings: any[] = []
    let blockedDates: any[] = []

    const matchesRoomBooking = (booking: any): boolean => {
      const bookingRoomId = String(booking.roomId ?? "").trim()
      const smoobuRoomId = String(booking.smoobuRoomId ?? booking.beds24RoomId ?? "").trim()
      const origin = String(booking.origin ?? "").toLowerCase()
      const siteId = String(room.id)

      // 🔹 Camera Familiare con Balcone
      if (roomType === "balcony") {
        // Prenotazioni dal sito: id 1
        if (origin === "site" && bookingRoomId === "1") return true

        // Prenotazioni da Booking/Beds24: id 2 o beds24RoomId 621530
        if (origin === "booking" && bookingRoomId === "2") return true
        if (smoobuRoomId === "621530") return true

        // Fallback: se la stanza in Firestore ha id 1, matcha anche quello
        if (bookingRoomId === siteId && siteId === "1") return true

        return false
      }

      // 🔹 Camera Matrimoniale con Vasca Idromassaggio
      if (roomType === "spa") {
        // Prenotazioni dal sito: id 2
        if (origin === "site" && bookingRoomId === "2") return true

        // Prenotazioni da Booking/Beds24: id 3 o beds24RoomId 621531
        if (origin === "booking" && bookingRoomId === "3") return true
        if (smoobuRoomId === "621531") return true

        // Fallback: se la stanza in Firestore ha id 2, matcha anche quello
        if (bookingRoomId === siteId && siteId === "2") return true

        return false
      }

      // 🔹 Caso generico: stanza che non riconosciamo per nome
      return bookingRoomId === siteId
    }

    const matchesRoomBlock = (blocked: any): boolean => {
      const blockedRoomId = String(blocked.roomId ?? "").trim()
      const siteId = String(room.id)

      if (roomType === "balcony") {
        // In blocked_dates probabilmente usi gli ID locali delle stanze
        if (blockedRoomId === "1") return true
        if (blockedRoomId === "621530") return true
        // sicurezza in più
        if (blockedRoomId === siteId && siteId === "1") return true
        return false
      }

      if (roomType === "spa") {
        if (blockedRoomId === "2") return true
        if (blockedRoomId === "621531") return true
        if (blockedRoomId === siteId && siteId === "2") return true
        return false
      }

      return blockedRoomId === siteId
    }

    const calculateStatus = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const hasActiveBooking = bookings.some((booking) => {
  if (!matchesRoomBooking(booking)) return false

  const status = String(booking.status ?? "").toLowerCase()
  // consideriamo attive sia le confermate che le in attesa
  if (!(status === "confirmed" || status === "pending")) {
    return false
  }

  const checkIn = new Date(booking.checkIn as string)
  const checkOut = new Date(booking.checkOut as string)
  checkIn.setHours(0, 0, 0, 0)
  checkOut.setHours(0, 0, 0, 0)

  return today >= checkIn && today < checkOut
})


      const isBlockedToday = blockedDates.some((blocked) => {
        if (!matchesRoomBlock(blocked)) return false

        const from = new Date(blocked.from as string)
        const to = new Date(blocked.to as string)
        from.setHours(0, 0, 0, 0)
        to.setHours(0, 0, 0, 0)

        return today >= from && today < to
      })

      const newStatus: RoomStatus =
        isBlockedToday ? "maintenance"
        : hasActiveBooking ? "booked"
        : "available"

      setCurrentStatus(newStatus)
    }

    // 🔹 Prenotazioni confermate (tutte), filtrate in JS
    const bookingsQuery = query(
      collection(db, "bookings"),
      
    )

    const blockedRef = collection(db, "blocked_dates")

    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      bookings = snapshot.docs.map((doc) => doc.data())
      calculateStatus()
    })

    const unsubBlocked = onSnapshot(blockedRef, (snapshot) => {
      blockedDates = snapshot.docs.map((doc) => doc.data())
      calculateStatus()
    })

    return () => {
      unsubBookings()
      unsubBlocked()
    }
  }, [room, roomType])


   useEffect(() => {
    const syncStatus = async () => {
      try {
        // Se non è cambiato rispetto a quello salvato, non scriviamo niente
        if (room.status === currentStatus) return

        const roomRef = doc(db, "rooms", String(room.id))
        await updateDoc(roomRef, { status: currentStatus })
      } catch (error) {
        console.error("[RoomStatusToggle] Errore aggiornando lo stato della stanza:", error)
      }
    }

    if (room.id) {
      syncStatus()
    }
  }, [room.id, room.status, currentStatus])

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "bg-green-600 text-white"
      case "booked":
        return "bg-red-600 text-white"
      case "maintenance":
        return "bg-yellow-600 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  const getStatusIcon = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-4 h-4" />
      case "booked":
        return <Home className="w-4 h-4" />
      case "maintenance":
        return <Wrench className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: RoomStatus) => {
    switch (status) {
      case "available":
        return "Disponibile"
      case "booked":
        return "Prenotata"
      case "maintenance":
        return "Manutenzione"
      default:
        return status
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-cinzel">{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Stato Attuale
          </span>
          <Badge
            className={`${getStatusColor(
              currentStatus
            )} flex items-center gap-1.5 px-3 py-1`}
          >
            {getStatusIcon(currentStatus)}
            <span className="font-medium">
              {getStatusLabel(currentStatus)}
            </span>
          </Badge>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <p className="text-xs text-muted-foreground">
            {currentStatus === "booked"
              ? "Camera occupata da prenotazione attiva"
              : currentStatus === "maintenance"
              ? "Camera in manutenzione - gestisci dalla sezione Blocca Date"
              : "Nessuna prenotazione per oggi"}
          </p>
        </div>

        <div className="pt-2 border-t space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacità:</span>
            <span className="font-medium">{room.capacity} Ospiti</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Prezzo:</span>
            <span className="font-medium">€{room.price}/notte</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
