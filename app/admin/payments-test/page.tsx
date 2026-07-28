"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle, Loader2, CreditCard, RefreshCw, Ban, AlertTriangle } from "lucide-react"

export default function PaymentsTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [bookingId, setBookingId] = useState("")
  const [newCheckIn, setNewCheckIn] = useState("")
  const [newCheckOut, setNewCheckOut] = useState("")

  const testBalancePayment = async () => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/payments/process-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel pagamento saldo")
      }

      setResult({
        success: true,
        message: "Pagamento saldo completato con successo!",
        data,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testChangeDates = async () => {
    if (!bookingId || !newCheckIn || !newCheckOut) {
      setError("Inserisci ID prenotazione e nuove date")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/bookings/change-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checkIn: newCheckIn,
          checkOut: newCheckOut,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel cambio date")
      }

      if (data.paymentRequired && data.paymentUrl) {
        setResult({
          success: true,
          message: "Checkout Stripe creato! Completa il pagamento nella finestra che si è aperta.",
          data: {
            ...data,
            instructions: "Dopo il pagamento, il webhook aggiornerà automaticamente il database",
          },
        })
        window.open(data.paymentUrl, "_blank")
      } else {
        setResult({
          success: true,
          message: "Date modificate con successo!",
          data,
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testCancellation = async (withRefund: boolean) => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reason: "Test cancellazione",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nella cancellazione")
      }

      setResult({
        success: true,
        message: `Prenotazione cancellata ${withRefund ? "con" : "senza"} rimborso!`,
        data,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testRefund = async () => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Call Stripe refund API
      const response = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          reason: "Test rimborso manuale",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nel rimborso")
      }

      setResult({
        success: true,
        message: "Rimborso elaborato con successo!",
        data,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testPenalty = async () => {
    if (!bookingId) {
      setError("Inserisci un ID prenotazione")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/payments/charge-penalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          penaltyAmount: 5000, // €50
          reason: "Test penale per cambio date",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Errore nell'addebito penale")
      }

      setResult({
        success: true,
        message: "Penale addebitata con successo!",
        data,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Sistema Pagamenti</h1>
        <p className="text-muted-foreground">
          Pagina di test per verificare pagamenti saldo, cambi date, cancellazioni, rimborsi e penalità
        </p>
      </div>

      <Tabs defaultValue="balance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="balance">Saldo</TabsTrigger>
          <TabsTrigger value="dates">Cambio Date</TabsTrigger>
          <TabsTrigger value="cancel">Cancellazione</TabsTrigger>
          <TabsTrigger value="refund">Rimborso</TabsTrigger>
          <TabsTrigger value="penalty">Penale</TabsTrigger>
        </TabsList>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Test Pagamento Saldo
              </CardTitle>
              <CardDescription>Simula il pagamento del saldo (70%) per una prenotazione esistente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="balance-booking-id">ID Prenotazione</Label>
                <Input
                  id="balance-booking-id"
                  placeholder="es: dU6WxnRgMA7OLzHti7T"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <Button onClick={testBalancePayment} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Testa Pagamento Saldo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Test Cambio Date
              </CardTitle>
              <CardDescription>Modifica le date di una prenotazione esistente (con possibile penale)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dates-booking-id">ID Prenotazione</Label>
                <Input
                  id="dates-booking-id"
                  placeholder="es: dU6WxnRgMA7OLzHti7T"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-check-in">Nuovo Check-in</Label>
                  <Input
                    id="new-check-in"
                    type="date"
                    value={newCheckIn}
                    onChange={(e) => setNewCheckIn(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-check-out">Nuovo Check-out</Label>
                  <Input
                    id="new-check-out"
                    type="date"
                    value={newCheckOut}
                    onChange={(e) => setNewCheckOut(e.target.value)}
                  />
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Penale di €50 applicata se il cambio avviene meno di 7 giorni prima del check-in
                </AlertDescription>
              </Alert>

              <Button onClick={testChangeDates} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testa Cambio Date
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Test Cancellazione
              </CardTitle>
              <CardDescription>
                Cancella una prenotazione con calcolo automatico del rimborso in base alla policy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-booking-id">ID Prenotazione</Label>
                <Input
                  id="cancel-booking-id"
                  placeholder="es: dU6WxnRgMA7OLzHti7T"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <Alert>
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">Policy di Cancellazione:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Oltre 7 giorni prima: rimborso 100%</li>
                    <li>2-7 giorni prima: rimborso 50%</li>
                    <li>Meno di 48 ore: nessun rimborso</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button onClick={() => testCancellation(true)} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Testa Cancellazione
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refund">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Test Rimborso Manuale
              </CardTitle>
              <CardDescription>Elabora un rimborso manuale completo per una prenotazione</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refund-booking-id">ID Prenotazione</Label>
                <Input
                  id="refund-booking-id"
                  placeholder="es: dU6WxnRgMA7OLzHti7T"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <Alert>
                <AlertDescription>Questo elaborerà un rimborso completo del 100% tramite Stripe</AlertDescription>
              </Alert>

              <Button onClick={testRefund} disabled={loading} variant="destructive" className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Testa Rimborso
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalty">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Test Addebito Penale
              </CardTitle>
              <CardDescription>Addebita una penale di €50 per modifiche tardive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="penalty-booking-id">ID Prenotazione</Label>
                <Input
                  id="penalty-booking-id"
                  placeholder="es: dU6WxnRgMA7OLzHti7T"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </div>

              <Alert>
                <AlertDescription>Verrà addebitata una penale di €50.00 tramite Stripe</AlertDescription>
              </Alert>

              <Button onClick={testPenalty} disabled={loading} variant="outline" className="w-full bg-transparent">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Testa Penale
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert className="mt-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <p className="font-semibold text-green-900">{result.message}</p>
            {result.data.instructions && <p className="mt-2 text-sm">{result.data.instructions}</p>}
            <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
