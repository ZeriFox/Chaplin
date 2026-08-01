"use client"
import type React from "react"
import { useState, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Award, CheckCircle2, Clock, Heart, Loader2, MapPin, MessageCircle, Phone, Send } from "lucide-react"

const CONTACT_INFO = {
  name: "CHAPLIN Luxury Holiday House",
  address: "Via della Pettinara, 48",
  city: "01100 Viterbo (VT)",
  phone: process.env.NEXT_PUBLIC_PRIVACY_PHONE || "+39 351 719 6320",
}

// Email offuscata per anti-spam
const getEmail = () => {
  const parts = ["Chaplinviterbo", "gmail", "com"]
  return `${parts[0]}@${parts[1]}.${parts[2]}`
}

export default function ContactsPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" })
  const [newsletterPhone, setNewsletterPhone] = useState("")
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [newsletterError, setNewsletterError] = useState("")
  const [notRobot, setNotRobot] = useState(false)
  const [emailButtonClicked, setEmailButtonClicked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [submitMessage, setSubmitMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submittedForm = new FormData(e.currentTarget)

    if (!notRobot) {
      alert(t("confirmNotRobot"))
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")
    setSubmitMessage("")

    try {
      const response = await fetch("/api/contact-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          website: submittedForm.get("website"),
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(t("contactSendFailure"))
      }

      setFormData({ name: "", email: "", subject: "", message: "" })
      setNotRobot(false)
      setSubmitStatus("success")
      setSubmitMessage(t("contactSendSuccess"))
    } catch (error) {
      setSubmitStatus("error")
      setSubmitMessage(error instanceof Error ? error.message : t("contactSendFailure"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailClick = useCallback(() => {
    if (!notRobot) {
      alert(t("confirmNotRobotEmail"))
      return
    }
    setEmailButtonClicked(true)
    window.location.href = `mailto:${getEmail()}`
  }, [notRobot, t])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submittedForm = new FormData(e.currentTarget)

    if (!newsletterConsent) {
      setNewsletterError(t("whatsappConsentRequired"))
      return
    }

    setNewsletterSubmitting(true)
    setNewsletterError("")

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newsletterPhone,
          marketingConsent: newsletterConsent,
          website: submittedForm.get("newsletter-website"),
        }),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(t("whatsappSubscribeFailure"))

      setIsSubscribed(true)
      setNewsletterPhone("")
      setNewsletterConsent(false)
    } catch (error) {
      setNewsletterError(error instanceof Error ? error.message : t("whatsappSubscribeFailure"))
    } finally {
      setNewsletterSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient mb-4">{t("contacts")}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("contactsPageSubtitle")}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12 animate-slide-in-right">
            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#c9a84c] mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-cinzel font-semibold text-[#c9a84c] dark:text-[#d4af37] mb-2 text-base">
                    {t("whereWeAre")}
                  </h3>
                  <p className="text-sm font-medium">{CONTACT_INFO.name}</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.address}</p>
                  <p className="text-sm text-muted-foreground">{CONTACT_INFO.city}</p>
                </div>
              </div>
            </div>

            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-[#c9a84c] mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-cinzel font-semibold text-[#c9a84c] dark:text-[#d4af37] mb-2 text-base">
                    {t("directContacts")}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <a
                        href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, "")}`}
                        className="text-sm font-medium hover:text-[#c9a84c] transition-colors"
                      >
                        {CONTACT_INFO.phone}
                      </a>
                      <p className="text-xs text-muted-foreground">{t("available247")}</p>
                    </div>
                    <div className="pt-2 border-t border-[#c9a84c]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox 
                          id="notRobot" 
                          checked={notRobot} 
                          onCheckedChange={(checked) => setNotRobot(checked === true)}
                          className="border-[#c9a84c]/50"
                        />
                        <label htmlFor="notRobot" className="text-xs text-muted-foreground cursor-pointer">
                          {t("notRobot")}
                        </label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEmailClick}
                        disabled={!notRobot}
                        className="w-full bg-transparent text-sm border-[#c9a84c]/40 hover:bg-[#c9a84c]/10 hover:border-[#c9a84c] disabled:opacity-50"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {t("sendEmail")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-invisible p-5">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-[#c9a84c] mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-cinzel font-semibold text-[#c9a84c] dark:text-[#d4af37] mb-2 text-base">
                    {t("informationService")}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{t("weekdaysShort")}</span>
                      <span className="text-muted-foreground">08:00 - 22:00</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{t("weekendsShort")}</span>
                      <span className="text-muted-foreground">09:00 - 21:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 card-invisible p-5">
              <h3 className="font-cinzel text-base font-semibold text-[#c9a84c] dark:text-[#d4af37] mb-2">
                {t("conciergeService")}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {t("conciergeUpdatedDescription")}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="bg-transparent text-sm border-[#c9a84c]/40 hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]"
              >
                {t("discoverServices")}
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <div className="mx-auto w-full max-w-3xl">
                <Card className="card-semi-transparent animate-slide-in-left">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-cinzel text-[#c9a84c] dark:text-[#d4af37]">
                      {t("sendMessage")}
                    </CardTitle>
                    <CardDescription className="text-sm">{t("responseTime")}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-1">
                        <Label htmlFor="name" className="text-sm">
                          {t("fullName")}
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          maxLength={120}
                          required
                          className="mt-1 focus-visible:ring-[#c9a84c]"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <Label htmlFor="email" className="text-sm">
                          {t("email")}
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          maxLength={254}
                          required
                          className="mt-1 focus-visible:ring-[#c9a84c]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="subject" className="text-sm">
                          {t("subject")}
                        </Label>
                        <Input
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          maxLength={160}
                          required
                          className="mt-1 focus-visible:ring-[#c9a84c]"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="message" className="text-sm">
                          {t("message")}
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          placeholder={t("writeMessage")}
                          className="mt-1 focus-visible:ring-[#c9a84c]"
                          rows={4}
                          maxLength={5000}
                          required
                        />
                      </div>

                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        className="sr-only"
                        aria-hidden="true"
                      />

                      <div className="md:col-span-2 flex items-center gap-2">
                        <Checkbox 
                          id="notRobotForm" 
                          checked={notRobot} 
                          onCheckedChange={(checked) => setNotRobot(checked === true)}
                          className="border-[#c9a84c]/50"
                        />
                        <label htmlFor="notRobotForm" className="text-sm text-muted-foreground cursor-pointer">
                          {t("notRobot")}
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <Button 
                          type="submit" 
                          disabled={!notRobot || isSubmitting}
                          className="w-full py-5 bg-[#1a1a1a] hover:bg-[#333] text-[#f5f5f0] disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("sendingMessage")}
                            </>
                          ) : (
                            t("send")
                          )}
                        </Button>
                      </div>

                      {submitStatus !== "idle" && (
                        <div
                          className={`md:col-span-2 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                            submitStatus === "success"
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-red-200 bg-red-50 text-red-800"
                          }`}
                          role="status"
                          aria-live="polite"
                        >
                          {submitStatus === "success" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          )}
                          <span>{submitMessage}</span>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 mb-12 max-w-3xl mx-auto animate-fade-in-up">
            <Card className="card-semi-transparent border-[#c9a84c]/20">
              <CardContent className="p-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MessageCircle className="w-5 h-5 text-[#c9a84c]" />
                    <h2 className="text-lg font-cinzel font-bold text-[#c9a84c] dark:text-[#d4af37]">
                      {t("whatsappOffersTitle")}
                    </h2>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {t("whatsappOffersDescription")}
                  </p>

                  {!isSubscribed ? (
                    <form onSubmit={handleNewsletterSubmit} className="max-w-2xl mx-auto space-y-3">
                      <input
                        type="text"
                        name="newsletter-website"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="hidden"
                      />
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          type="tel"
                          placeholder={t("whatsappPhonePlaceholder")}
                          value={newsletterPhone}
                          onChange={(e) => setNewsletterPhone(e.target.value)}
                          autoComplete="tel"
                          required
                          className="h-10 focus-visible:ring-[#c9a84c]"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={newsletterSubmitting || !newsletterConsent}
                          className="h-10 bg-[#1a1a1a] hover:bg-[#333] text-[#f5f5f0]"
                        >
                          {newsletterSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("whatsappSubscribe")}
                        </Button>
                      </div>
                      <div className="flex items-start justify-center gap-2 text-left text-xs text-muted-foreground">
                        <Checkbox
                          id="newsletter-consent"
                          checked={newsletterConsent}
                          onCheckedChange={(checked) => setNewsletterConsent(checked === true)}
                          className="mt-0.5"
                        />
                        <Label htmlFor="newsletter-consent" className="cursor-pointer text-xs font-normal leading-relaxed">
                          {t("whatsappConsentText")}
                          <Link href="/privacy" className="underline hover:text-foreground">
                            {t("privacyNotice")}
                          </Link>
                          .
                        </Label>
                      </div>
                      {newsletterError && (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                          {newsletterError}
                        </p>
                      )}
                    </form>
                  ) : (
                    <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-lg p-3 max-w-md mx-auto">
                      <div className="flex items-center justify-center gap-2 text-[#1a1a1a]">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{t("whatsappSubscribeThanks")}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      <span>{t("whatsappPromotionalMessages")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>{t("exclusiveOffers")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
