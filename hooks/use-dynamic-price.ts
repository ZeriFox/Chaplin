"use client"

import { useState, useEffect } from "react"

interface DynamicPriceResult {
  pricePerNight: number
  totalPrice: number
  loading: boolean
  error: string | null
}

export function useDynamicPrice(
  roomId: string,
  checkIn: string | undefined,
  checkOut: string | undefined,
  guests = 2,
): DynamicPriceResult {
  const [pricePerNight, setPricePerNight] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDynamicPrice = async () => {
      if (!roomId || !checkIn || !checkOut) {
        setPricePerNight(0)
        setTotalPrice(0)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/bookings/calculate-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            checkIn,
            checkOut,
            guests,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to calculate price")
        }

        const data = await response.json()

        console.log("[v0] Dynamic price calculated:", {
          roomId,
          checkIn,
          checkOut,
          pricePerNight: data.pricePerNight,
          totalPrice: data.totalAmount / 100,
        })

        setPricePerNight(data.pricePerNight || 0)
        setTotalPrice(data.totalAmount ? data.totalAmount / 100 : 0)
      } catch (err) {
        console.error("[v0] Error fetching dynamic price:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setPricePerNight(0)
        setTotalPrice(0)
      } finally {
        setLoading(false)
      }
    }

    fetchDynamicPrice()
  }, [roomId, checkIn, checkOut, guests])

  return { pricePerNight, totalPrice, loading, error }
}
