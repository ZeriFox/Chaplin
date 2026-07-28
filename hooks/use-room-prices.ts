"use client"

import { useEffect, useState } from "react"
import { getAllRooms } from "@/lib/firebase"

export function useRoomPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({
    "1": 180, // Camera Familiare con Balcone (default)
    "2": 150, // Camera Matrimoniale con Vasca Idromassaggio (default)
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const rooms = await getAllRooms()
        const priceMap: Record<string, number> = {}

        // Calculate today's dynamic price for each room
        const today = new Date().toISOString().split("T")[0]
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

        for (const room of rooms) {
          try {
            // Call the calculate-price API to get today's dynamic price
            const response = await fetch("/api/bookings/calculate-price", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomId: room.id,
                checkIn: today,
                checkOut: tomorrow,
              }),
            })

            if (response.ok) {
              const data = await response.json()
              priceMap[room.id] = data.pricePerNight || room.price
            } else {
              priceMap[room.id] = room.price
            }
          } catch (error) {
            console.error(`[v0] Error fetching dynamic price for room ${room.id}:`, error)
            priceMap[room.id] = room.price
          }
        }

        setPrices(priceMap)
      } catch (error) {
        console.error("[v0] Error fetching room prices:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPrices()
  }, [])

  return { prices, loading }
}
