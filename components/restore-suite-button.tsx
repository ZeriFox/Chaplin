"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

// Restores the single "La Suite" room document in Firestore.
// Needed after a database rebuild: the site's price calculation reads
// `rooms/{id}` and breaks if that document is missing. Clicking this button
// (re)creates it without overwriting an already-configured base price.
export function RestoreSuiteButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleRestore = async () => {
    setStatus("loading")
    setMessage("")
    try {
      const res = await fetch("/api/rooms/ensure-suite", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore durante il ripristino")

      setStatus("success")
      setMessage(
        data.created
          ? `Suite creata correttamente (prezzo base €${data.price}). I prezzi ora funzionano.`
          : `Suite già presente e aggiornata (prezzo base €${data.price}).`,
      )
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Errore sconosciuto")
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleRestore}
        disabled={status === "loading"}
        className="w-full sm:w-auto bg-transparent"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${status === "loading" ? "animate-spin" : ""}`} />
        {status === "loading" ? "Ripristino in corso..." : "Ripristina camera (La Suite)"}
      </Button>

      {status === "success" && (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Usa questo pulsante se i prezzi non compaiono (es. dopo un ripristino del database) per ricreare la camera
        &quot;La Suite&quot;. Non modifica un prezzo base già impostato.
      </p>
    </div>
  )
}
