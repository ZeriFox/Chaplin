"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Scale, CreditCard, Calendar, AlertTriangle, Mail, Phone } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"

// Config contatti (no hardcode in UI)
const TERMS_CONTACT = {
  email: process.env.NEXT_PUBLIC_TERMS_EMAIL || "Chaplinviterbo@gmail.com",
  phone: process.env.NEXT_PUBLIC_TERMS_PHONE || "+39 351 719 6320",
}

export default function TerminiPage() {
  const { t } = useLanguage()
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero */}
          <div
            ref={heroRef}
            className={`text-center mb-12 transition-all duration-1000 ${
              heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scale className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient animate-text-shimmer">
                {t("termsAndConditions")}
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("termsSubtitle")}</p>
          </div>

          <div className="space-y-8">
            {/* Info generali */}
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <FileText className="w-5 h-5" />
                  {t("generalInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("generalInfoDesc")}</p>
                <p>{t("termsAcceptance")}</p>
              </CardContent>
            </Card>

            {/* Prenotazioni e cancellazioni */}
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Calendar className="w-5 h-5" />
                  {t("bookingsAndCancellations")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">{t("bookingPolicy")}</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{t("bookingConfirmed")}</li>
                    <li>{t("checkInHours")}</li>
                    <li>{t("checkOutHours")}</li>
                    <li>{t("idRequired")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{t("cancellationPolicyTitle")}</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{t("freeCancellation7days")}</li>
                    <li>{t("cancellation7to3days")}</li>
                    <li>{t("cancellationWithin3days")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Pagamenti e prezzi */}
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CreditCard className="w-5 h-5" />
                  {t("paymentsAndPrices")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">{t("paymentMethods")}</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{t("deposit30Required")}</li>
                    <li>{t("balanceAtCheckIn")}</li>
                    <li>{t("acceptedPayments")}</li>
                    <li>{t("touristTax")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{t("prices")}</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{t("seasonalPrices")}</li>
                    <li>{t("vatIncluded")}</li>
                    <li>{t("specialOffers")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Responsabilità e comportamento */}
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <AlertTriangle className="w-5 h-5" />
                  {t("responsibilityAndBehavior")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">{t("guestResponsibility")}</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{t("respectRules")}</li>
                    <li>{t("quietHours")}</li>
                    <li>{t("noSmoking")}</li>
                    <li>{t("reportDamages")}</li>
                    <li>{t("maxGuests")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{t("liabilityLimitations")}</h4>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{t("travelInsurance")}</li>
                    <li>{t("limitedLiability")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Legge applicabile */}
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Scale className="w-5 h-5" />
                  {t("applicableLaw")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("italianLaw")}</p>
                <p>{t("italianVersion")}</p>
              </CardContent>
            </Card>

            {/* Contatti */}
            <Card className="card-invisible bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Mail className="w-5 h-5" />
                  {t("contactsAndSupport")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{t("questionsAboutTerms")}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href={`mailto:${TERMS_CONTACT.email}`} className="hover:text-primary transition-colors">
                      {TERMS_CONTACT.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a
                      href={`tel:${TERMS_CONTACT.phone.replace(/\s+/g, "")}`}
                      className="hover:text-primary transition-colors"
                    >
                      {TERMS_CONTACT.phone}
                    </a>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">{t("lastUpdated")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
