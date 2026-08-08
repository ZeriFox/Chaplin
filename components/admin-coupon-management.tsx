"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2, Pencil, Plus, TicketPercent, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { getCurrentIdToken } from "@/lib/firebase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

 type Coupon = {
  code: string
  description?: string
  type: "percentage" | "fixed"
  value: number
  active: boolean
  startsAt?: string | null
  endsAt?: string | null
  minSubtotal?: number
  maxUses?: number | null
  maxUsesPerCustomer?: number | null
  usageCount?: number
}

type CouponForm = {
  code: string
  description: string
  type: "percentage" | "fixed"
  value: string
  active: boolean
  startsAt: string
  endsAt: string
  minSubtotal: string
  maxUses: string
  maxUsesPerCustomer: string
}

const EMPTY_FORM: CouponForm = {
  code: "",
  description: "",
  type: "percentage",
  value: "",
  active: true,
  startsAt: "",
  endsAt: "",
  minSubtotal: "",
  maxUses: "",
  maxUsesPerCustomer: "",
}

async function adminRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await getCurrentIdToken()
  if (!token) throw new Error("Sessione amministratore scaduta")

  return fetch(input, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

function couponToForm(coupon: Coupon): CouponForm {
  return {
    code: coupon.code,
    description: coupon.description || "",
    type: coupon.type,
    value: String(coupon.value),
    active: coupon.active,
    startsAt: coupon.startsAt || "",
    endsAt: coupon.endsAt || "",
    minSubtotal: coupon.minSubtotal ? String(coupon.minSubtotal) : "",
    maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
    maxUsesPerCustomer: coupon.maxUsesPerCustomer ? String(coupon.maxUsesPerCustomer) : "",
  }
}

export function AdminCouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const response = await adminRequest("/api/admin/coupons")
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Impossibile caricare i coupon")
      setCoupons(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Caricamento coupon non riuscito")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingCode(null)
  }

  const payload = (source = form) => ({
    code: source.code.trim().toUpperCase(),
    description: source.description.trim(),
    type: source.type,
    value: Number(source.value),
    active: source.active,
    startsAt: source.startsAt || null,
    endsAt: source.endsAt || null,
    minSubtotal: Number(source.minSubtotal || 0),
    maxUses: Number(source.maxUses || 0),
    maxUsesPerCustomer: Number(source.maxUsesPerCustomer || 0),
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await adminRequest("/api/admin/coupons", {
        method: editingCode ? "PATCH" : "POST",
        body: JSON.stringify(payload()),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Salvataggio coupon non riuscito")
      toast.success(editingCode ? "Coupon aggiornato" : "Coupon creato")
      resetForm()
      await loadCoupons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvataggio coupon non riuscito")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const next = couponToForm({ ...coupon, active: !coupon.active })
      const response = await adminRequest("/api/admin/coupons", {
        method: "PATCH",
        body: JSON.stringify(payload(next)),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Aggiornamento non riuscito")
      await loadCoupons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aggiornamento non riuscito")
    }
  }

  const removeCoupon = async (code: string) => {
    if (!window.confirm(`Eliminare definitivamente il coupon ${code}?`)) return
    try {
      const response = await adminRequest(`/api/admin/coupons?code=${encodeURIComponent(code)}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Eliminazione non riuscita")
      toast.success("Coupon eliminato")
      if (editingCode === code) resetForm()
      await loadCoupons()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Eliminazione non riuscita")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-primary" />
            <CardTitle className="font-cinzel text-primary">{editingCode ? `Modifica ${editingCode}` : "Nuovo coupon"}</CardTitle>
          </div>
          <CardDescription>Crea codici percentuali o a importo fisso da applicare alle richieste di prenotazione.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Codice *</Label>
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") }))}
                  placeholder="ESTATE10"
                  disabled={Boolean(editingCode)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Tipo *</Label>
                <select
                  id="coupon-type"
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CouponForm["type"] }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">Percentuale (%)</option>
                  <option value="fixed">Importo fisso (€)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-value">Valore *</Label>
                <Input
                  id="coupon-value"
                  type="number"
                  min="0.01"
                  max={form.type === "percentage" ? "100" : undefined}
                  step="0.01"
                  value={form.value}
                  onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-minimum">Spesa minima (€)</Label>
                <Input
                  id="coupon-minimum"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minSubtotal}
                  onChange={(event) => setForm((current) => ({ ...current, minSubtotal: event.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-start">Valido dal</Label>
                <Input id="coupon-start" type="date" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-end">Valido fino al</Label>
                <Input id="coupon-end" type="date" min={form.startsAt || undefined} value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-limit">Utilizzi massimi</Label>
                <Input id="coupon-limit" type="number" min="0" step="1" value={form.maxUses} onChange={(event) => setForm((current) => ({ ...current, maxUses: event.target.value }))} placeholder="Illimitati" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-customer-limit">Limite per cliente</Label>
                <Input id="coupon-customer-limit" type="number" min="0" step="1" value={form.maxUsesPerCustomer} onChange={(event) => setForm((current) => ({ ...current, maxUsesPerCustomer: event.target.value }))} placeholder="Illimitato" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-description">Descrizione interna</Label>
                <Input id="coupon-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Promozione estate" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4" />
              Coupon attivo
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingCode ? "Salva modifiche" : "Crea coupon"}
              </Button>
              {editingCode && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  <X className="mr-2 h-4 w-4" /> Annulla
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupon disponibili</CardTitle>
          <CardDescription>Gli utilizzi vengono conteggiati quando viene inviata una richiesta con il codice.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : coupons.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nessun coupon creato.</p>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon.code} className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg">{coupon.code}</strong>
                      <Badge variant={coupon.active ? "default" : "secondary"}>{coupon.active ? "Attivo" : "Disattivato"}</Badge>
                      <Badge variant="outline">{coupon.type === "percentage" ? `${coupon.value}%` : `€${coupon.value}`}</Badge>
                    </div>
                    {coupon.description && <p className="text-sm text-muted-foreground">{coupon.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      Validità: {coupon.startsAt || "subito"} → {coupon.endsAt || "senza scadenza"} · minimo €{Number(coupon.minSubtotal || 0).toFixed(2)} · utilizzi {coupon.usageCount || 0}/{coupon.maxUses || "∞"} · per cliente {coupon.maxUsesPerCustomer || "∞"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setEditingCode(coupon.code); setForm(couponToForm(coupon)); window.scrollTo({ top: 0, behavior: "smooth" }) }}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifica
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(coupon)}>
                      {coupon.active ? "Disattiva" : "Attiva"}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => removeCoupon(coupon.code)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Elimina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
