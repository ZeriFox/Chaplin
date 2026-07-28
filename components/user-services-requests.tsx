"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useLanguage } from "@/components/language-provider"

interface ServiceRequest {
  id: string
  services: Array<{ name: string; price: number }>
  notes: string
  status: "pending" | "confirmed" | "cancelled"
  createdAt: string | { _seconds: number; _nanoseconds: number }
  userEmail: string
  userName: string
}

export function UserServicesRequests() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  const getLocale = () => {
    const localeMap: Record<string, string> = {
      it: "it-IT",
      en: "en-US",
      fr: "fr-FR",
      es: "es-ES",
      de: "de-DE",
    }
    return localeMap[language] || "it-IT"
  }

  const parseDate = (createdAt: string | { _seconds: number; _nanoseconds: number }): Date => {
    if (typeof createdAt === "string") {
      return new Date(createdAt)
    }
    // Handle Firestore Timestamp format {_seconds, _nanoseconds}
    if (createdAt && typeof createdAt === "object" && "_seconds" in createdAt) {
      return new Date(createdAt._seconds * 1000)
    }
    return new Date()
  }

  useEffect(() => {
    if (!user?.email) return

    const loadRequests = async () => {
      try {
        const response = await fetch(`/api/extra-services/list?userEmail=${encodeURIComponent(user.email)}`)
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Service requests received:", data.requests)
          data.requests?.forEach((req: any) => {
            console.log("[v0] Request createdAt:", req.createdAt, "Type:", typeof req.createdAt)
          })
          setRequests(data.requests || [])
        }
      } catch (error) {
        console.error("[v0] Error loading service requests:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [user])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("extraServicesRequests")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("extraServicesRequests")}
          </CardTitle>
          <CardDescription>{t("noExtraServicesRequests")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {t("pending")}
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("confirmed")}
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {t("cancelled")}
          </Badge>
        )
      default:
        return null
    }
  }

  const totalPrice = (services: Array<{ price: number }>) => {
    return services.reduce((sum, s) => sum + s.price, 0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t("extraServicesRequests")}
        </CardTitle>
        <CardDescription>{t("extraServicesDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => {
          const date = parseDate(request.createdAt)

          return (
            <div key={request.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">
                    {t("requestFrom")} {date.toLocaleDateString(getLocale())}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {request.services.length} {request.services.length > 1 ? t("services") : t("service")}{" "}
                    {t("servicesRequested")}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="space-y-2">
                {request.services.map((service, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{service.name}</span>
                    <span className="font-medium">€{service.price}</span>
                  </div>
                ))}
              </div>

              {request.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{t("notes")}:</p>
                  <p className="text-sm mt-1">{request.notes}</p>
                </div>
              )}

              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-sm font-semibold">{t("estimatedTotal")}:</span>
                <span className="text-lg font-bold text-primary">€{totalPrice(request.services)}</span>
              </div>

              {request.status === "pending" && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{t("managerWillRespond")}</p>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

