"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, Phone, RefreshCw, Trash2, UserCheck, UserX } from "lucide-react"
import { auth } from "@/lib/firebase"
import { useLanguage } from "@/components/language-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type NewsletterContact = {
  id: string
  phone: string
  status: "active" | "unsubscribed"
  source: string
  createdAt: string | null
  updatedAt: string | null
}

async function authenticatedRequest(url: string, t: (key: string) => string, options: RequestInit = {}) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error(t("adminSessionUnavailable"))

  const token = await currentUser.getIdToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const result = await response.json()

  if (!response.ok) throw new Error(t("operationFailed"))
  return result
}

export function NewsletterContactsAdmin() {
  const { language, t } = useLanguage()
  const [contacts, setContacts] = useState<NewsletterContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const result = await authenticatedRequest("/api/admin/newsletter-contacts", t)
      setContacts(result.contacts || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("loadContactsFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const updateStatus = async (contact: NewsletterContact) => {
    const nextStatus = contact.status === "active" ? "unsubscribed" : "active"
    setUpdatingId(contact.id)
    setError("")

    try {
      await authenticatedRequest("/api/admin/newsletter-contacts", t, {
        method: "PATCH",
        body: JSON.stringify({ id: contact.id, status: nextStatus }),
      })
      setContacts((current) =>
        current.map((item) => (item.id === contact.id ? { ...item, status: nextStatus } : item)),
      )
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : t("updateContactFailed"))
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteContact = async (contact: NewsletterContact) => {
    if (!window.confirm(`${t("deleteContactConfirm")} ${contact.phone}`)) return

    setUpdatingId(contact.id)
    setError("")

    try {
      await authenticatedRequest(`/api/admin/newsletter-contacts?id=${encodeURIComponent(contact.id)}`, t, {
        method: "DELETE",
      })
      setContacts((current) => current.filter((item) => item.id !== contact.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("deleteContactFailed"))
    } finally {
      setUpdatingId(null)
    }
  }

  const exportCsv = () => {
    const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`
    const rows = [
      [t("phone"), t("contactStatusLabel"), t("contactSourceLabel"), t("registeredOn")],
      ...contacts.map((contact) => [
        contact.phone,
        contact.status === "active" ? t("activeStatus") : t("unsubscribedStatus"),
        contact.source,
        contact.createdAt ? new Date(contact.createdAt).toLocaleString(language) : "",
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `contatti-newsletter-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const activeContacts = contacts.filter((contact) => contact.status === "active").length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("whatsappContactsTitle")}</CardTitle>
            <CardDescription>{t("whatsappContactsDescription")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadContacts()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("refreshContacts")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={contacts.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {t("exportCsv")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{contacts.length} {t("totalContactsLabel")}</Badge>
          <Badge className="bg-emerald-600 text-white">{activeContacts} {t("activeContactsLabel")}</Badge>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("loadingContacts")}
          </div>
        ) : contacts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noWhatsappContacts")}</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0 text-[#c9a84c]" /> {contact.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("registeredOn")} {contact.createdAt ? new Date(contact.createdAt).toLocaleString(language) : "—"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                    {contact.status === "active" ? t("activeStatus") : t("unsubscribedStatus")}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void updateStatus(contact)}
                    disabled={updatingId === contact.id}
                  >
                    {contact.status === "active" ? (
                      <UserX className="mr-2 h-4 w-4" />
                    ) : (
                      <UserCheck className="mr-2 h-4 w-4" />
                    )}
                    {contact.status === "active" ? t("deactivateContact") : t("reactivateContact")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => void deleteContact(contact)}
                    disabled={updatingId === contact.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {t("delete")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
