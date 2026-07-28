"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react"

export default function TestEmailPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; error?: string } | null>(null)

  const handleTest = async () => {
    if (!email) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          message: `Email di test inviata con successo a ${email}. Controlla la tua casella di posta (e lo spam).`,
        })
      } else {
        setResult({
          success: false,
          message: "Errore nell'invio dell'email",
          error: data.error,
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: "Errore nella richiesta",
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Test Invio Email
            </CardTitle>
            <CardDescription>Testa l'invio delle email di conferma prenotazione</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Indirizzo Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tuo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button onClick={handleTest} disabled={loading || !email} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Invia Email di Test
                </>
              )}
            </Button>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  <div className="font-medium">{result.message}</div>
                  {result.error && <div className="text-sm mt-2 opacity-90">Errore: {result.error}</div>}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
              <p className="font-medium">Note:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>L'email di test contiene dati fittizi</li>
                <li>Controlla anche la cartella spam</li>
                <li>Verifica che RESEND_API_KEY sia configurata</li>
                <li>Verifica che il dominio email sia verificato su Resend</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </main>
  )
}
