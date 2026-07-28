"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Ban, CheckCircle2, AlertCircle, Unlock } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BlockedDate {
  id: string
  roomId: string
  from: string
  to: string
  reason: string
  createdAt: any
}

export function BookingBlockDates() {
  const [roomId, setRoomId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState("maintenance")
  const [blocking, setBlocking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const [loadingBlocked, setLoadingBlocked] = useState(true)

  useEffect(() => {
    loadBlockedDates()
  }, [])

  const loadBlockedDates = async () => {
    try {
      setLoadingBlocked(true)
      const response = await fetch("/api/smoobu/blocked-dates")
      const data = await response.json()
      
      if (response.ok) {
        setBlockedDates(data.blockedDates || [])
      }
    } catch (err) {
      console.error("[Smoobu] Error loading blocked dates:", err)
    } finally {
      setLoadingBlocked(false)
    }
  }

  const blockDates = async () => {
    if (!roomId || !from || !to) {
      setError("Compila tutti i campi")
      return
    }

    setBlocking(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/smoobu/block-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, from, to, reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel blocco delle date")
      }

      setSuccess(true)
      setRoomId("")
      setFrom("")
      setTo("")
      setReason("maintenance")

      await loadBlockedDates()

      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setBlocking(false)
    }
  }

  const unblockDates = async (blockId: string) => {
    setUnblocking(blockId)
    setError(null)

    try {
      const response = await fetch("/api/smoobu/unblock-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nello sblocco delle date")
      }

      await loadBlockedDates()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto")
    } finally {
      setUnblocking(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="w-5 h-5" />
          Blocca Date per Manutenzione
        </CardTitle>
        <CardDescription>Blocca le date per manutenzione o altri motivi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="room">Camera</Label>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger id="room">
              <SelectValue placeholder="Seleziona camera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Camera Familiare</SelectItem>
              <SelectItem value="2">Camera Matrimoniale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from">Da</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">A</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo</Label>
          <Textarea
            id="reason"
            placeholder="Es: Manutenzione programmata, pulizia straordinaria..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {success && (
          <Alert className="bg-[#c9a84c]/10 border-[#c9a84c]/30">
            <CheckCircle2 className="h-4 w-4 text-[#c9a84c]" />
            <AlertDescription className="text-[#1a1a1a]">Date bloccate con successo!</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={blockDates} disabled={blocking} className="w-full">
          <Ban className="w-4 h-4 mr-2" />
          {blocking ? "Blocco in corso..." : "Blocca Date"}
        </Button>

        {blockedDates.length > 0 && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium text-sm">Date Bloccate ({blockedDates.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {blockedDates.map((blocked) => (
                <div 
                  key={blocked.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      Camera {blocked.roomId === "1" ? "Familiare" : "Matrimoniale"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDate(blocked.from)} - {formatDate(blocked.to)}
                    </p>
                    {blocked.reason && (
                      <p className="text-muted-foreground text-xs italic mt-1">
                        {blocked.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unblockDates(blocked.id)}
                    disabled={unblocking === blocked.id}
                  >
                    <Unlock className="w-3 h-3 mr-1" />
                    {unblocking === blocked.id ? "..." : "Sblocca"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingBlocked && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Caricamento date bloccate...
          </p>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Le date bloccate non saranno disponibili per le prenotazioni e verranno sincronizzate con Smoobu.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
