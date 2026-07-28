"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight, Ban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { collection, query, onSnapshot } from "firebase/firestore"
import type { Booking } from "@/lib/booking-utils"

interface BookingCalendarFilteredProps {
  bookings: Booking[]
  roomId: string
  roomName: string
}

interface BlockedDate {
  id: string
  roomId: string
  from: string
  to: string
  reason: string
  createdAt: any
}

export function BookingCalendarFiltered({ bookings, roomId, roomName }: BookingCalendarFilteredProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const normalizeRoomIds = (id: string, roomName: string): string[] => {
  const ids: string[] = []

  if (id) {
    ids.push(id)
  }

  const lowerName = roomName.toLowerCase()

  // Camera Familiare con Balcone
  if (lowerName.includes("familiare") || lowerName.includes("balcone")) {
    ids.push("2", "621530")
  }

  // Camera Matrimoniale con Vasca Idromassaggio / Suite
  if (
    lowerName.includes("vasca") ||
    lowerName.includes("idromassaggio") ||
    lowerName.includes("suite")
  ) {
    ids.push("3", "621531")
  }

  // Evita duplicati
  return Array.from(new Set(ids))
}


  const roomIdsToMatch = normalizeRoomIds(roomId, roomName)

const filteredBookings = bookings.filter((booking) => {
  const bookingRoomId = String(booking.roomId ?? "").trim()
  const bookingRoomName = (booking.roomName ?? "").toLowerCase()
  const targetName = roomName.toLowerCase()

  const idMatches =
    bookingRoomId !== "" && roomIdsToMatch.includes(bookingRoomId)

  const nameMatches =
    bookingRoomName !== "" &&
    (bookingRoomName.includes(targetName) || targetName.includes(bookingRoomName))

  return idMatches || nameMatches
})

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  useEffect(() => {
    const unsubscribeBlocked = onSnapshot(
      collection(db, "blocked_dates"),
      (snapshot) => {
        const blockedData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
           .filter((blocked: any) =>
        roomIdsToMatch.includes(String(blocked.roomId))
      ) as BlockedDate[]
        
        setBlockedDates(blockedData)
      }
    )

    return () => {
      unsubscribeBlocked()
    }
  }, [roomId, roomName])

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getBookingsForDate = (date: Date) => {
    return filteredBookings.filter((booking) => {
      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)
      
      checkIn.setHours(0, 0, 0, 0)
      checkOut.setHours(0, 0, 0, 0)
      const dateToCheck = new Date(date)
      dateToCheck.setHours(0, 0, 0, 0)
      
      return dateToCheck >= checkIn && dateToCheck < checkOut
    })
  }

  const isDateBlocked = (date: Date) => {
  const dateToCheck = new Date(date)
  dateToCheck.setHours(0, 0, 0, 0)

  // 1) Blocca sempre tutte le date precedenti ad oggi
  if (dateToCheck < todayStart) {
    return true
  }

  // 2) Blocca sempre le date che hanno almeno una prenotazione
  if (getBookingsForDate(dateToCheck).length > 0) {
    return true
  }

  // 3) Blocchi manuali da Firestore (manutenzione, chiusure, ecc.)
  return blockedDates.some((blocked) => {
    const from = new Date(blocked.from)
    const to = new Date(blocked.to)

    from.setHours(0, 0, 0, 0)
    to.setHours(0, 0, 0, 0)

    return dateToCheck >= from && dateToCheck < to
  })
}


  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

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

  const days = getDaysInMonth()
  const weekDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <Button variant="outline" size="icon" onClick={previousMonth} className="h-9 w-9 shrink-0 bg-transparent">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium min-w-[160px] sm:min-w-[200px] text-center text-sm sm:text-base">
          {currentDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9 shrink-0 bg-transparent">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 p-3 bg-muted/30 rounded-lg text-xs justify-center sm:justify-start">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#f5f5f0] border border-[#d4d0c8]" />
          <span>Disponibile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
          <span>Booking.com</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-pink-100 border border-pink-300" />
          <span>Airbnb</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
          <span>Expedia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#c9a84c]/15 border border-[#c9a84c]/40" />
          <span>Sito / Dirette</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-100 border border-orange-400" />
          <span>Manutenzione</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="p-1 sm:p-2" />
          }

          const dayBookings = getBookingsForDate(day)
          const isToday = day.toDateString() === new Date().toDateString()
          const hasBookings = dayBookings.length > 0
          const blocked = isDateBlocked(day)

          let bgColor = "bg-[#f5f5f0] border-[#d4d0c8]"
          if (blocked && !hasBookings) {
            bgColor = "bg-orange-50 border-orange-300"
          } else if (hasBookings) {
            const hasBookingCom = dayBookings.some((b) => b.origin === "booking")
            const hasAirbnb = dayBookings.some((b) => b.origin === "airbnb")
            const hasExpedia = dayBookings.some((b) => b.origin === "expedia")
            const hasSite = dayBookings.some((b) => b.origin === "site" || b.origin === "direct")

            if (hasBookingCom) {
              bgColor = "bg-blue-50 border-blue-300"
            } else if (hasAirbnb) {
              bgColor = "bg-pink-50 border-pink-300"
            } else if (hasExpedia) {
              bgColor = "bg-yellow-50 border-yellow-300"
            } else if (hasSite) {
              bgColor = "bg-[#c9a84c]/10 border-[#c9a84c]/30"
            }
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`
                p-1.5 sm:p-2 rounded-lg border transition-all hover:border-primary relative 
                min-h-[45px] sm:min-h-[60px] md:min-h-[70px]
                ${isToday ? "ring-2 ring-primary" : ""}
                ${bgColor}
                ${selectedDate?.toDateString() === day.toDateString() ? "ring-2 ring-primary" : ""}
              `}
            >
              <div className="text-xs sm:text-sm font-medium">{day.getDate()}</div>
              {blocked && (
                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                  <Ban className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-700" />
                </div>
              )}
              {hasBookings && (
                <div className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                  {dayBookings.slice(0, 1).map((booking) => (
                    <Badge
                      key={booking.id}
                      variant="secondary"
                      className={`text-[8px] sm:text-[10px] px-1 py-0 h-auto leading-tight ${
                        booking.origin === "booking"
                          ? "bg-blue-600 text-white"
                          : booking.origin === "airbnb"
                            ? "bg-pink-600 text-white"
                            : booking.origin === "expedia"
                              ? "bg-yellow-600 text-white"
                              : "bg-[#c9a84c] text-white"
                      }`}
                    >
                      {booking.origin === "direct" ? "diretta" : booking.origin}
                    </Badge>
                  ))}
                  {dayBookings.length > 1 && (
                    <span className="text-[8px] sm:text-xs text-muted-foreground">+{dayBookings.length - 1}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 border rounded-lg bg-muted/30">
          <h4 className="font-semibold mb-3 text-sm sm:text-base">
            Prenotazioni per {selectedDate.toLocaleDateString("it-IT")}
          </h4>
          {isDateBlocked(selectedDate) && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-900">
                <Ban className="w-4 h-4" />
                <span className="font-medium text-sm">Camera in manutenzione</span>
              </div>
            </div>
          )}
          {getBookingsForDate(selectedDate).length === 0 && !isDateBlocked(selectedDate) ? (
            <p className="text-sm text-muted-foreground">Nessuna prenotazione per questa data</p>
          ) : (
            <div className="space-y-2">
              {getBookingsForDate(selectedDate).map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-background rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base">
                      {booking.guestFirst || booking.firstName} {booking.guestLast || booking.lastName}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {booking.roomName} • {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {booking.guests} ospiti • €{booking.total || booking.totalAmount}
                    </p>
                  </div>
                  <div className="flex gap-2 items-start sm:flex-col sm:items-end">
                    <Badge
                      className={`text-xs text-white ${
                        booking.origin === "booking"
                          ? "bg-blue-600"
                          : booking.origin === "airbnb"
                            ? "bg-pink-600"
                            : booking.origin === "expedia"
                              ? "bg-yellow-600"
                              : "bg-[#c9a84c]"
                      }`}
                    >
                      {booking.origin === "direct" ? "Diretta" : booking.origin}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        booking.status === "confirmed"
                          ? "border-[#c9a84c] text-[#c9a84c]"
                          : booking.status === "pending"
                            ? "border-yellow-600 text-yellow-600"
                            : "border-red-600 text-red-600"
                      }`}
                    >
                      {booking.status === "confirmed"
                        ? "Confermata"
                        : booking.status === "pending"
                          ? "In attesa"
                          : "Cancellata"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
