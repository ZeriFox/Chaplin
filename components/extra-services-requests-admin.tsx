"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Clock, CheckCircle, XCircle } from "lucide-react"

type ServiceRequest = {
  id: string
  requestId: string
  bookingId?: string
  userEmail: string
  userName: string
  services: Array<{ name: string; price: number }>
  totalPrice: number
  status: "pending" | "confirmed" | "cancelled"
  notes?: string
  createdAt: any
}

export function ExtraServicesRequestsAdmin() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = async () => {
    try {
      const response = await fetch("/api/extra-services/list")
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error("Error loading service requests:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const updateStatus = async (requestId: string, status: string) => {
    try {
      const response = await fetch("/api/extra-services/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      })

      if (response.ok) {
        loadRequests()
      }
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            In Attesa
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confermata
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Annullata
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return <div>Caricamento richieste...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Richieste Servizi Extra</h2>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nessuna richiesta di servizi extra al momento
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{request.userName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{request.userEmail}</p>
                    {request.bookingId && (
                      <p className="text-xs text-muted-foreground mt-1">Prenotazione: {request.bookingId}</p>
                    )}
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Servizi Richiesti:</h4>
                  <ul className="space-y-1">
                    {request.services.map((service, idx) => (
                      <li key={idx} className="text-sm">
                        • {service.name} - €{service.price}
                      </li>
                    ))}
                  </ul>
                  <p className="font-bold mt-2">Totale: €{request.totalPrice}</p>
                </div>

                {request.notes && (
                  <div>
                    <h4 className="font-semibold mb-1">Note:</h4>
                    <p className="text-sm text-muted-foreground">{request.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Select value={request.status} onValueChange={(value) => updateStatus(request.requestId, value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">In Attesa</SelectItem>
                      <SelectItem value="confirmed">Confermata</SelectItem>
                      <SelectItem value="cancelled">Annullata</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`mailto:${request.userEmail}`, "_blank")}
                  >
                    Rispondi al Cliente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
