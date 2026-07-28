"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Eye, Lock, Users, Mail, Phone } from "lucide-react"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"

export default function PrivacyPage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()
  const { t } = useLanguage()

const PRIVACY_CONTACT = {
  email: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@all22suite.com",
  phone: process.env.NEXT_PUBLIC_PRIVACY_PHONE || "+39 328 328 7303",
}

  return (
    <main className="min-h-screen">
      <Header />

      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div
            ref={heroRef}
            className={`text-center mb-12 transition-all duration-1000 ${heroVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[50px]"}`}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary animate-pulse" />
              <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-roman-gradient animate-text-shimmer">
                {t("privacyPolicy")}
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("privacySubtitle")}</p>
          </div>

          <div className="space-y-8">
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Eye className="w-5 h-5" />
                  {t("infoWeCollect")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("infoWeCollectDesc")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("contactData")}</li>
                  <li>{t("bookingInfo")}</li>
                  <li>{t("paymentData")}</li>
                  <li>{t("usageInfo")}</li>
                </ul>
              </CardContent>
            </Card>
<Card className="card-invisible bg-gradient-to-br from-primary/5 to-accent/5">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-primary">
      <Mail className="w-5 h-5" />
      {t("contactUs")}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <p className="mb-4">{t("privacyContactDesc")}</p>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        <span>{PRIVACY_CONTACT.email}</span>
      </div>
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-primary" />
        <span>{PRIVACY_CONTACT.phone}</span>
      </div>
    </div>
    <p className="text-sm text-muted-foreground mt-4">{t("lastUpdated")}</p>
  </CardContent>
</Card>
            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Lock className="w-5 h-5" />
                  {t("howWeUseData")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("howWeUseDataDesc")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("manageBookings")}</li>
                  <li>{t("communicate")}</li>
                  <li>{t("improveServices")}</li>
                  <li>{t("sendOffers")}</li>
                  <li>{t("legalObligations")}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Users className="w-5 h-5" />
                  {t("dataSharing")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("dataSharingDesc")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("necessaryForService")}</li>
                  <li>{t("requiredByLaw")}</li>
                  <li>{t("trustedProviders")}</li>
                  <li>{t("explicitConsent")}</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="card-invisible">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Shield className="w-5 h-5" />
                  {t("yourRights")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{t("yourRightsDesc")}</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>{t("accessData")}</li>
                  <li>{t("correctData")}</li>
                  <li>{t("deleteData")}</li>
                  <li>{t("limitProcessing")}</li>
                  <li>{t("dataPortability")}</li>
                  <li>{t("objectMarketing")}</li>
                </ul>
              </CardContent>
            </Card>
         </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
