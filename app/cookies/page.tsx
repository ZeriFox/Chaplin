"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cookie, Settings, BarChart, Eye, RotateCcw } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useState, useEffect, useMemo } from "react"
import { useLanguage } from "@/components/language-provider"

type CookiePreferences = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = "cookie-consent"
const STORAGE_AT = "cookie-consent-date"
const BANNER_DISMISSED = "cookie-banner-dismissed"
const MONTHS_VALID = 12

function isExpired(iso?: string | null) {
  if (!iso) return true
  const saved = new Date(iso)
  const now = new Date()
  const diffMonths = (now.getTime() - saved.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return diffMonths >= MONTHS_VALID
}

export default function CookiesPage() {
  const { t } = useLanguage()
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  })
  const [loaded, setLoaded] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const at = localStorage.getItem(STORAGE_AT)
      if (saved && !isExpired(at)) {
        setPreferences(JSON.parse(saved))
      } else {
        // scaduto o assente: reset
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(STORAGE_AT)
        localStorage.removeItem(BANNER_DISMISSED)
      }
    } catch {}
    setLoaded(true)
  }, [])

  const show = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 2200)
  }

  const persist = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      localStorage.setItem(STORAGE_AT, new Date().toISOString())
      localStorage.setItem(BANNER_DISMISSED, "true")
      setPreferences(prefs)
      return true
    } catch {
      return false
    }
  }

  const acceptAll = () => {
    if (persist({ necessary: true, analytics: true, marketing: true })) show(t("allPreferencesSaved"))
    else show(t("errorSavingPreferences"))
  }

  const onlyNecessary = () => {
    if (persist({ necessary: true, analytics: false, marketing: false })) show(t("onlyNecessaryAccepted"))
    else show(t("errorSavingPreferences"))
  }

  const toggle = (k: keyof CookiePreferences) => {
    if (k === "necessary") return
    setPreferences(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const saveCustom = () => {
    if (persist(preferences)) show(t("yourPreferencesSaved"))
    else show(t("errorSavingPreferences"))
  }

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_AT)
      localStorage.removeItem(BANNER_DISMISSED)
      setPreferences({ necessary: true, analytics: false, marketing: false })
      show("✅ Preferenze reimpostate.")
    } catch {
      show(t("errorSavingPreferences"))
    }
  }

  const statusBadge = useMemo(() => {
    const { analytics, marketing } = preferences
    if (analytics && marketing) return "Tutti i cookie attivi"
    if (!analytics && !marketing) return "Solo necessari"
    if (analytics && !marketing) return "Necessari + Analitici"
    return "Necessari + Marketing"
  }, [preferences])

  if (!loaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Header />

      {notification && (
        <div className="fixed top-24 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-md animate-slide-in-right">
          {notification}
        </div>
      )}

      <section
        ref={heroRef}
        className="pt-24 pb-10 bg-gradient-to-br from-muted/40 to-transparent"
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <div className={`text-center mb-8 transition-all ${heroVisible ? "animate-fade-in-up" : "opacity-0 translate-y-6"}`}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <Cookie className="w-7 h-7 text-primary" />
              <h1 className="text-4xl md:text-5xl font-cinzel font-bold">{t("cookiePolicy")}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{t("cookiePolicySubtitle")}</p>
          </div>

          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Settings className="w-5 h-5" />
                {t("manageCookiePreferences")}
              </CardTitle>
              <span className="text-xs px-2 py-1 rounded bg-muted text-foreground">{statusBadge}</span>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground">{t("customizeCookiePreferences")}</p>

              {/* Necessary */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                <div>
                  <h4 className="font-semibold">{t("necessaryCookiesTitle")}</h4>
                  <p className="text-sm text-muted-foreground">{t("necessaryCookiesAlwaysActive")}</p>
                </div>
                <div className="w-12 h-6 bg-[#c9a84c] rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                <div>
                  <h4 className="font-semibold">{t("analyticsCookiesTitle")}</h4>
                  <p className="text-sm text-muted-foreground">{t("analyticsCookiesHelp")}</p>
                </div>
                <button
                  onClick={() => toggle("analytics")}
                  className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 shadow-inner ${
                    preferences.analytics ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                  }`}
                  aria-pressed={preferences.analytics}
                  aria-label="Attiva/disattiva cookie analitici"
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 shadow" />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                <div>
                  <h4 className="font-semibold">{t("marketingCookiesTitle")}</h4>
                  <p className="text-sm text-muted-foreground">{t("marketingCookiesAds")}</p>
                </div>
                <button
                  onClick={() => toggle("marketing")}
                  className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 shadow-inner ${
                    preferences.marketing ? "bg-primary justify-end" : "bg-gray-300 justify-start"
                  }`}
                  aria-pressed={preferences.marketing}
                  aria-label="Attiva/disattiva cookie marketing"
                >
                  <div className="w-4 h-4 bg-white rounded-full mx-1 shadow" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={onlyNecessary} variant="outline" className="flex-1">
                  {t("onlyNecessaryButton")}
                </Button>
                <Button onClick={saveCustom} className="flex-1">
                  {t("savePreferencesButton")}
                </Button>
                <Button onClick={acceptAll} className="flex-1">
                  {t("acceptAllButton")}
                </Button>
                <Button onClick={reset} variant="ghost" className="sm:w-auto" title="Reimposta">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Spiegazioni */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Cookie className="w-5 h-5" />
                  {t("whatAreCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent><p>{t("cookiesExplanation")}</p></CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Settings className="w-5 h-5" />
                  {t("technicalDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{t("technicalExplanation")}</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>{t("technicalItem1")}</li>
                  <li>{t("technicalItem2")}</li>
                  <li>{t("technicalItem3")}</li>
                  <li>{t("technicalItem4")}</li>
                </ul>
                <div className="rounded-md border bg-[#c9a84c]/10 p-3 text-sm">
                  {t("alwaysActive")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <BarChart className="w-5 h-5" />
                  {t("analyticsCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{t("analyticsExplanation")}</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>{t("analyticsItem1")}</li>
                  <li>{t("analyticsItem2")}</li>
                  <li>{t("analyticsItem3")}</li>
                  <li>{t("analyticsItem4")}</li>
                </ul>
                <div className="rounded-md border bg-blue-50 p-3 text-sm">
                  {t("requireConsent")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Eye className="w-5 h-5" />
                  {t("marketingCookies")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p>{t("marketingExplanation")}</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>{t("marketingItem1")}</li>
                  <li>{t("marketingItem2")}</li>
                  <li>{t("marketingItem3")}</li>
                  <li>{t("marketingItem4")}</li>
                </ul>
                <div className="rounded-md border bg-orange-50 p-3 text-sm">
                  {t("requireConsent")}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 text-center">
                <h3 className="font-cinzel text-lg font-semibold text-primary mb-2">{t("questionsTitle")}</h3>
                <p className="text-muted-foreground mb-3">{t("questionsDescription")}</p>
                <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

