"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Facebook, Instagram, Clock, MessageCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const StripeIcon = (props: any) => (
  <svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"
      fill="currentColor"
    />
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

const GooglePayIcon = (props: any) => (
  <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="48" height="32" rx="4" fill="white" />
    {/* Google G logo */}
    <path
      d="M16 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42s1.95-4.42 4.34-4.42c1.36 0 2.27.58 2.79 1.08l1.9-1.83C19.47 5.69 17.89 5 16 5c-3.87 0-7 3.13-7 7s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H16z"
      fill="#4285F4"
    />
    <path
      d="M16 19c1.89 0 3.47-.69 4.69-1.87l-1.9-1.83c-.52.5-1.43 1.08-2.79 1.08-2.77 0-3.81-1.99-3.97-3.02H8.66c.63 2.37 2.59 4.64 7.34 4.64z"
      fill="#34A853"
    />
    <path
      d="M12.03 13.38c-.08-.24-.13-.5-.13-.76s.05-.52.13-.76V8.64H8.66c-.42.83-.66 1.77-.66 2.76s.24 1.93.66 2.76l3.37-2.78z"
      fill="#FBBC04"
    />
    <path
      d="M16 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C19.47 5.69 17.89 5 16 5c-4.75 0-6.71 2.27-7.34 4.64l3.37 2.78c.16-1.03 1.2-3.02 3.97-3.02z"
      fill="#EA4335"
    />
    {/* Pay text */}
    <text x="28" y="18" fill="#5F6368" fontSize="9" fontWeight="500" fontFamily="Arial, sans-serif">
      Pay
    </text>
  </svg>
)

const ApplePayIcon = (props: any) => (
  <svg viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="48" height="32" rx="4" fill="white" />
    {/* Apple logo */}
    <path
      d="M15.5 10.5c-.3.4-.8.7-1.3.6-.1-.5.1-1 .4-1.3.3-.4.8-.7 1.2-.7.1.5 0 1-.3 1.4zm.3.5c-.7 0-1.2.4-1.5.4s-.8-.4-1.4-.4c-.7 0-1.4.4-1.7 1-.8 1.3-.2 3.3.5 4.4.4.5.8 1.1 1.4 1.1s.8-.4 1.3-.4.8.4 1.4.4 1-.5 1.3-1.1c.4-.6.6-1.1.6-1.2 0 0-1.2-.5-1.2-1.8s1-1.6 1-1.7c-.5-.8-1.3-.8-1.6-.8zm4.7-.3v7.8h1.2v-2.7h1.7c1.5 0 2.6-1 2.6-2.5s-1-2.6-2.5-2.6h-2.9zm1.2 1h1.5c1 0 1.6.5 1.6 1.5s-.6 1.6-1.6 1.6h-1.5v-3.1zm5.8 6.8c.8 0 1.5-.4 1.8-1h0v.9h1.1v-4.2c0-1.2-1-2-2.5-2-1.4 0-2.4.8-2.5 1.9h1.1c.1-.5.6-.9 1.3-.9.9 0 1.4.4 1.4 1.1v.5l-1.8.1c-1.7.1-2.6.8-2.6 1.9 0 1.2.9 1.9 2.2 1.9zm.3-.9c-.8 0-1.3-.4-1.3-1s.5-1 1.4-1l1.7-.1v.5c0 .9-.7 1.5-1.8 1.5zm4.5 3.4c1.2 0 1.8-.5 2.3-1.9l2.2-6.2h-1.2l-1.5 5h0l-1.5-5h-1.3l2.1 5.9-.1.3c-.2.6-.5.8-1 .8-.1 0-.3 0-.4 0v1c.1 0 .3 0 .4 0z"
      fill="#000"
    />
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
                src="/images/chaplin-logo.png"
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
                href="https://wa.me/393757017689"
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
              <div className="h-10 w-16 flex items-center justify-center bg-white rounded-md p-1.5 hover:scale-105 transition-transform">
                <StripeIcon className="h-full w-full text-[#1a1a1a]" />
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
              <div className="h-10 w-16 flex items-center justify-center bg-white rounded-md p-1.5 hover:scale-105 transition-transform">
                <GooglePayIcon className="h-full w-full" />
              </div>
              <div className="h-10 w-16 flex items-center justify-center hover:scale-105 transition-transform">
                <ApplePayIcon className="h-full w-full" />
              </div>
            </div>
          </div>

          {/* Copyright - ora sotto i metodi di pagamento */}
          <div className="pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/80">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <p className="flex items-center gap-2">
                  <span>© COPYRIGHT 2025</span>
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


