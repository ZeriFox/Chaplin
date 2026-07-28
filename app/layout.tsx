export const dynamic = "force-dynamic"
export const revalidate = 0
import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Playfair_Display, Cinzel, Cormorant_Garamond } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { LanguageProvider } from "../components/language-provider"
import { AuthProvider } from "../components/auth-provider"
import { CookieConsent } from "../components/cookie-consent"
import { WhatsAppButton } from "../components/whatsapp-button"
import "./globals.css"


const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "CHAPLIN Luxury Holiday House",
  description:
    "Experience authentic Italian hospitality at CHAPLIN Luxury Holiday House bed & breakfast in the Viterbo, Italia",
  generator: "next.js",
  icons: {
    icon: "/images/chaplin-logo.png",
    apple: "/images/chaplin-logo.png",
  },
  metadataBase: new URL("https://chaplinhome.vercel.app/"),
  openGraph: {
    title: "CHAPLIN Luxury Holiday House",
    description:
      "Experience authentic Italian hospitality at CHAPLIN Luxury Holiday House bed & breakfast in the Posizione eccellente, valutata 9.6/10!(punteggio ottenuto da 110 giudizi)",
    url: "https://chaplinhome.vercel.app/",
    siteName: "CHAPLIN Luxury Holiday House",
    images: [
      {
        url: "/images/chaplin-logo.png",
        width: 1200,
        height: 630,
        alt: "Chaplin Luxury Holiday House",
      },
    ],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "",
    description:
      "Experience authentic Italian hospitality at CHAPLIN Luxury Holiday House bed & breakfast in the Valutata dagli ospiti dopo il soggiorno presso CHAPLIN Luxury Holiday House.",
    images: ["/images/chaplin-logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "GTM-XXXXXXX"

  return (
    <html lang="it">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
          }}
        />
      </head>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${playfairDisplay.variable} ${cinzel.variable} ${cormorant.variable}`}
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <AuthProvider>
          <LanguageProvider>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            <CookieConsent />
            <WhatsAppButton />
          </LanguageProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}


