"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Facebook, Instagram, Clock, MessageCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const BankTransferIcon = (props: any) => (
  <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="48" height="32" rx="4" fill="white" />
    <path d="M24 5 10 11h28L24 5Z" fill="#233B63" />
    <path d="M12 13h24M14 13v8m7-8v8m7-8v8m7-8v8M10 23h28" stroke="#233B63" strokeWidth="2" />
    <text x="24" y="29" fill="#233B63" fontSize="4.8" fontWeight="700" fontFamily="Arial, sans-serif" textAnchor="middle">
      BONIFICO
    </text>
  </svg>
)

const VisaIcon = (props: any) => (
  <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="48" height="32" rx="4" fill="#1A1F71" />
    <text x="24" y="20" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif" textAnchor="middle">
      VISA
    </text>
  </svg>
)

const MastercardIcon = (props: any) => (
  <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="48" height="32" rx="4" fill="white" />
    <circle cx="18" cy="16" r="8" fill="#EB001B" />
    <circle cx="30" cy="16" r="8" fill="#F79E1B" />
    <path d="M24 10c-1.5 1.3-2.5 3.2-2.5 5.5s1 4.2 2.5 5.5c1.5-1.3 2.5-3.2 2.5-5.5S25.5 11.3 24 10z" fill="#FF5F00" />
  </svg>
)

const PayPalIcon = (props: any) => (
  <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="48" height="32" rx="4" fill="#0070BA" />
    <g transform="translate(12, 8)">
      {/* First P */}
      <path
        d="M4 0h4.5c2.5 0 4 1.2 4 3.2 0 2.1-1.6 3.8-4.2 3.8H6.5L5.8 10H3L4 0zm1.9 5.5h1.8c1.2 0 2-.6 2-1.8 0-.9-.6-1.4-1.7-1.4H6.2l-.3 3.2z"
        fill="white"
      />
      {/* Second P */}
      <path
        d="M11 0h4.5c2.5 0 4 1.2 4 3.2 0 2.1-1.6 3.8-4.2 3.8h-1.8l-.7 3H10L11 0zm1.9 5.5h1.8c1.2 0 2-.6 2-1.8 0-.9-.6-1.4-1.7-1.4h-1.8l-.3 3.2z"
        fill="#00A4E0"
      />
    </g>
  </svg>
)

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Villa Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src="/images/chaplin-logo-readable.png"
                alt="Chaplin Luxury Holiday House Logo"
                width={160}
                height={60}
                className="brightness-0 invert"
              />
            </div>
            <p className="text-background/80 mb-4 text-sm leading-relaxed">{t("footerDescription")}</p>
            <p className="text-xs text-background/60 tracking-wider mb-2">CIN: IT056059CZYAQZBIX7</p>
          </div>


          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t("contacts")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <div>
                  <p>Via della Pettinara 48</p>
                  <p>01100 Viterbo (VT)</p>
                  <p>Italia</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <a href="tel:+39 351 719 6320" className="hover:text-primary transition-colors">
                  +39 351 719 6320
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <Link href="/contatti" className="hover:text-primary transition-colors">
                  Contattaci via email
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <span>
                  {t("checkIn")}: dalle 15:00 | {t("checkOut")}: entro le 11:00
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t("quickLinks")}</h3>
            <div className="space-y-2 text-sm">
              <Link href="/camere" className="block hover:text-primary transition-colors">
                Suite Esclusiva
              </Link>
              <Link href="/servizi" className="block hover:text-primary transition-colors">
                {t("services")}
              </Link>
              <Link href="/prenota" className="block hover:text-primary transition-colors">
                {t("bookNow")}
              </Link>
              <Link href="/contatti" className="block hover:text-primary transition-colors">
                {t("contacts")}
              </Link>
            </div>
          </div>

          {/* Social & Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">{t("followUs")}</h3>
            <div className="flex gap-4 mb-6">
              <a
                href="https://www.facebook.com/people/Chaplin-Luxury-Holiday-House/100064760898219/#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-background/80 hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/chaplinluxuryholidayhouse?igsh=MWEzcW5vbm5xdXRjcg=="
                target="_blank"
                rel="noopener noreferrer"
                className="text-background/80 hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://api.whatsapp.com/send?phone=393517196320"
                target="_blank"
                rel="noopener noreferrer"
                className="text-background/80 hover:text-primary transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>

            <div className="space-y-2 text-sm">
              <Link href="/privacy" className="block hover:text-primary transition-colors">
                {t("privacyPolicy")}
              </Link>
              <Link href="/cookies" className="block hover:text-primary transition-colors">
                {t("cookiePolicy")}
              </Link>
              <Link href="/termini" className="block hover:text-primary transition-colors">
                {t("termsOfService")}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-background/20 mt-8 pt-8">
          {/* Metodi di pagamento */}
          <div className="flex flex-col items-center gap-4 pb-8 border-b border-background/20">
            <p className="text-xs text-background/60 uppercase tracking-wider">Metodi di Pagamento Accettati</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div
                className="h-10 w-16 flex items-center justify-center hover:scale-105 transition-transform"
                aria-label="Nexi"
                title="Nexi"
              >
                <Image
                  src="/images/nexi-pay-logo.png"
                  alt="Nexi Pay"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded object-contain"
                />
              </div>
              <div className="h-10 w-16 flex items-center justify-center hover:scale-105 transition-transform">
                <VisaIcon className="h-full w-full" />
              </div>
              <div className="h-10 w-16 flex items-center justify-center hover:scale-105 transition-transform">
                <MastercardIcon className="h-full w-full" />
              </div>
              <div className="h-10 w-16 flex items-center justify-center hover:scale-105 transition-transform">
                <PayPalIcon className="h-full w-full" />
              </div>
              <div
                className="h-10 w-24 flex items-center justify-center rounded-md bg-white px-2 hover:scale-105 transition-transform"
                aria-label="Postepay"
                title="Postepay"
              >
                <img
                  src="https://www.media.poste.it/115928d8-bbe0-41ff-963a-1de8efe7a784/lg/webp/logo-pp%402x"
                  alt="Postepay"
                  className="h-auto w-full"
                />
              </div>
              <div
                className="h-10 w-16 flex items-center justify-center hover:scale-105 transition-transform"
                aria-label="Bonifico bancario"
                title="Bonifico bancario"
              >
                <BankTransferIcon className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Copyright - ora sotto i metodi di pagamento */}
          <div className="pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/80">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <p className="flex items-center gap-2">
                  <span>© COPYRIGHT 2026</span>
                  <Link
                    href="/admin"
                    className="inline-flex items-center opacity-30 hover:opacity-100 transition-opacity"
                    title="Admin"
                  >
                    <Image src="/images/chaplin-logo.png" alt="Admin" width={20} height={20} className="rounded-sm" />
                  </Link>
                </p>
                <p>CHAPLIN Luxury Holiday House</p>
                <p>{t("allRightsReserved")}</p>
              </div>

              <div className="flex items-center gap-2">
                <span>POWERED BY </span>
                <div className="flex items-center gap-1">
                  <Image src="/images/ekobit-logo.png" alt="EkoBit S.r.l." width={16} height={16} className="rounded" />
                  <Link href="https://ekobit.it/" target="_blank" rel="noopener noreferrer" className="font-medium">
                    EkoBit S.r.l.
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}



