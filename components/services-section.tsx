"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"

export function ServicesSection() {
  const { language } = useLanguage()

  const sectionContent: Record<string, { 
    title: string
    subtitle: string
    description: string
    noDeposit: string
    freeCancellation: string
    infoBtn: string
    bookBtn: string
    size: string
    guests: string
  }> = {
    it: {
      title: "La Suite Esclusiva",
      subtitle: "CHAPLIN Luxury Holiday House",
      description: "",
      noDeposit: "Nessun anticipo richiesto",
      freeCancellation: "Cancellazione gratuita",
      infoBtn: "Scopri di piu",
      bookBtn: "Prenota ora",
      size: "57 mq",
      guests: "Max 2 ospiti",
    },
    en: {
      title: "The Apartment",
      subtitle: "CHAPLIN Luxury Holiday House",
      description: "",
      noDeposit: "No deposit required",
      freeCancellation: "Free cancellation",
      infoBtn: "Learn more",
      bookBtn: "Book now",
      size: "57 sqm",
      guests: "Max 2 guests",
    },
    fr: {
      title: "L'Appartement",
      subtitle: "CHAPLIN Luxury Holiday House",
      description: "",
      noDeposit: "Aucun acompte requis",
      freeCancellation: "Annulation gratuite",
      infoBtn: "En savoir plus",
      bookBtn: "Reserver",
      size: "57 m2",
      guests: "Max 2 personnes",
    },
    es: {
      title: "El Apartamento",
      subtitle: "CHAPLIN Luxury Holiday House",
      description: "",
      noDeposit: "Sin deposito requerido",
      freeCancellation: "Cancelacion gratuita",
      infoBtn: "Saber mas",
      bookBtn: "Reservar",
      size: "57 m2",
      guests: "Max 2 huespedes",
    },
    de: {
      title: "Die Wohnung",
      subtitle: "CHAPLIN Luxury Holiday House",
      description: "",
      noDeposit: "Keine Anzahlung erforderlich",
      freeCancellation: "Kostenlose Stornierung",
      infoBtn: "Mehr erfahren",
      bookBtn: "Jetzt buchen",
      size: "57 qm",
      guests: "Max 2 Gaste",
    },
  }

  const content = sectionContent[language] || sectionContent.it

  const images = [
    { src: "/images/chaplin-camera-matrimoniale.jpeg", alt: "Camera matrimoniale della suite" },
    { src: "/images/spa1.jpg", alt: "Vasca idromassaggio" },
    { src: "/images/room-1.jpg", alt: "Zona notte suite" },
  ]

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Title */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#1a1a1a] mb-3 tracking-wide"
            style={{ fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif" }}
          >
            {content.title}
          </h2>
          <div className="w-12 sm:w-16 h-0.5 bg-[#c9a84c] mx-auto" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Images Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 aspect-video relative overflow-hidden">
              <Image
                src="/images/pool.jpg"
                alt="Piscina CHAPLIN"
                fill
                className="object-cover"
              />
            </div>
            {images.slice(0, 2).map((img, index) => (
              <div key={index} className="aspect-square relative overflow-hidden">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Content */}
          <div>
            {/* Title */}
            <h3 
              className="text-2xl sm:text-3xl text-[#1a1a1a] mb-2"
              style={{ fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif" }}
            >
              {content.subtitle}
            </h3>
            
            {/* Size & Guests */}
            <p className="text-sm text-[#c9a84c] mb-4">
              {content.size} | {content.guests}
            </p>

            {/* Description */}
            {content.description ? (
              <p className="text-[#6b6560] mb-6 leading-relaxed">
                {content.description}
              </p>
            ) : null}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="outline"
                className="flex-1 border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white rounded-none py-5"
              >
                <Link href="/camere/appartamento-chaplin">{content.infoBtn}</Link>
              </Button>
              <Button
                asChild
                className="flex-1 bg-[#c9a84c] hover:bg-[#b8973b] text-[#1a1a1a] rounded-none py-5"
              >
                <Link href="/prenota">{content.bookBtn}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
