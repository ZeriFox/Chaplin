"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAllRooms, updateRoomPrice, type RoomData } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

export function PriceManagement() {
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    try {
      const roomsData = await getAllRooms()
      setRooms(roomsData)
    } catch (error) {
      console.error("Error loading rooms:", error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le camere",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handlePriceUpdate(roomId: string, newPrice: number) {
    if (newPrice <= 0) {
      toast({
        title: "Errore",
        description: "Il prezzo deve essere maggiore di 0",
        variant: "destructive",
      })
      return
    }

    setUpdating(roomId)
    try {
      await updateRoomPrice(roomId, newPrice)
      await loadRooms()
      toast({
        title: "Successo",
        description: "Prezzo aggiornato con successo",
      })
    } catch (error) {
      console.error("Error updating price:", error)
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il prezzo",
        variant: "destructive",
      })
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <div>Caricamento...</div>
  }

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <Card key={room.id}>
          <CardHeader>
            <CardTitle>{room.name}</CardTitle>
            <CardDescription>{room.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor={`price-${room.id}`}>Prezzo per notte (€)</Label>
                <Input
                  id={`price-${room.id}`}
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={room.price}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.target as HTMLInputElement
                      handlePriceUpdate(room.id, Number.parseFloat(input.value))
                    }
                  }}
                />
              </div>
              <Button
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector("input")
                  if (input) {
                    handlePriceUpdate(room.id, Number.parseFloat(input.value))
                  }
                }}
                disabled={updating === room.id}
              >
                {updating === room.id ? "Aggiornamento..." : "Aggiorna Prezzo"}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Prezzo attuale: €{room.price}/notte</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
