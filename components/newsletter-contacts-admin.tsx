"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Loader2, Mail, Phone, RefreshCw, Trash2, UserCheck, UserX } from "lucide-react"
import { auth } from "@/lib/firebase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type NewsletterContact = {
  id: string
  email: string
  phone: string
  status: "active" | "unsubscribed"
  source: string
  createdAt: string | null
  updatedAt: string | null
}

async function authenticatedRequest(url: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error("Sessione amministratore non disponibile")

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

  if (!response.ok) throw new Error(result.error || "Operazione non riuscita")
  return result
}

export function NewsletterContactsAdmin() {
  const [contacts, setContacts] = useState<NewsletterContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const result = await authenticatedRequest("/api/admin/newsletter-contacts")
      setContacts(result.contacts || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossibile caricare i contatti")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const updateStatus = async (contact: NewsletterContact) => {
    const nextStatus = contact.status === "active" ? "unsubscribed" : "active"
    setUpdatingId(contact.id)
    setError("")

    try {
      await authenticatedRequest("/api/admin/newsletter-contacts", {
        method: "PATCH",
        body: JSON.stringify({ id: contact.id, status: nextStatus }),
      })
      setContacts((current) =>
        current.map((item) => (item.id === contact.id ? { ...item, status: nextStatus } : item)),
      )
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossibile aggiornare il contatto")
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteContact = async (contact: NewsletterContact) => {
    if (!window.confirm(`Eliminare definitivamente ${contact.email} dalla lista contatti?`)) return

    setUpdatingId(contact.id)
    setError("")

    try {
      await authenticatedRequest(`/api/admin/newsletter-contacts?id=${encodeURIComponent(contact.id)}`, {
        method: "DELETE",
      })
      setContacts((current) => current.filter((item) => item.id !== contact.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Impossibile eliminare il contatto")
    } finally {
      setUpdatingId(null)
    }
  }

  const exportCsv = () => {
    const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`
    const rows = [
      ["Email", "Telefono", "Stato", "Origine", "Data iscrizione"],
      ...contacts.map((contact) => [
        contact.email,
        contact.phone,
        contact.status === "active" ? "Attivo" : "Disiscritto",
        contact.source,
        contact.createdAt ? new Date(contact.createdAt).toLocaleString("it-IT") : "",
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
            <CardTitle>Contatti newsletter</CardTitle>
            <CardDescription>Email e numeri di telefono raccolti dal modulo del sito.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadContacts()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={contacts.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Esporta CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{contacts.length} contatti totali</Badge>
          <Badge className="bg-emerald-600 text-white">{activeContacts} attivi</Badge>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Caricamento contatti…
          </div>
        ) : contacts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nessun contatto newsletter registrato.</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 break-all font-medium">
                    <Mail className="h-4 w-4 flex-shrink-0 text-[#c9a84c]" /> {contact.email}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0 text-[#c9a84c]" /> {contact.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Iscritto il {contact.createdAt ? new Date(contact.createdAt).toLocaleString("it-IT") : "—"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={contact.status === "active" ? "default" : "secondary"}>
                    {contact.status === "active" ? "Attivo" : "Disiscritto"}
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
                    {contact.status === "active" ? "Disattiva" : "Riattiva"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => void deleteContact(contact)}
                    disabled={updatingId === contact.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Elimina
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
