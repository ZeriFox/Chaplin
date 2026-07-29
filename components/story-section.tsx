"use client"

import Image from "next/image"
import { useLanguage } from "@/components/language-provider"
import { Wifi, Home, Utensils, Car, KeyRound, Snowflake, Flame } from "lucide-react"

export function StorySection() {
  const { language } = useLanguage()

  const storyContent: Record<string, { title: string; subtitle: string; paragraph1: string; paragraph2: string; galleryTitle: string }> = {
    it: {
      title: "CHAPLIN Luxury Holiday House",
      subtitle: "Suite Esclusiva a Viterbo",
      paragraph1:
        "Una elegante suite indipendente situata nel centro storico di Viterbo, ideale per una fuga di coppia in cerca di relax.",
      paragraph2:
        "L'ambiente è raffinato e curato nei minimi dettagli, offre il massimo comfort: zona notte, zona giorno, cucina attrezzata, bagno privato e area spa interna ad uso esclusivo. 57 mq di puro benessere per un soggiorno indimenticabile.",
      galleryTitle: "Citta di Viterbo",
    },
    en: {
      title: "CHAPLIN Luxury Holiday House",
      subtitle: "Exclusive Suite in Viterbo",
      paragraph1:
        "An elegant independent suite located in the historic center of Viterbo, ideal for a couple's getaway in search of relaxation.",
      paragraph2:
        "The environment is refined and attentive to every detail, offering maximum comfort: sleeping area, living area, equipped kitchen, private bathroom and an internal spa area for exclusive use. 57 sqm of pure wellness for an unforgettable stay.",
      galleryTitle: "City of Viterbo",
    },
    fr: {
      title: "CHAPLIN Luxury Holiday House",
      subtitle: "Suite Exclusive a Viterbo",
      paragraph1:
        "Une elegante suite independante situee dans le centre historique de Viterbo, ideale pour une escapade en couple a la recherche de detente.",
      paragraph2:
        "L'environnement est raffine et soigne dans les moindres details, offrant un confort maximal : coin nuit, coin jour, cuisine equipee, salle de bain privee et espace spa interieur a usage exclusif. 57 m2 de pur bien-etre pour un sejour inoubliable.",
      galleryTitle: "Ville de Viterbo",
    },
    es: {
      title: "CHAPLIN Luxury Holiday House",
      subtitle: "Suite Exclusiva en Viterbo",
      paragraph1:
        "Una elegante suite independiente situada en el centro historico de Viterbo, ideal para una escapada en pareja en busca de relajacion.",
      paragraph2:
        "El ambiente es refinado y cuidado en cada detalle, ofreciendo el maximo confort: zona de noche, zona de dia, cocina equipada, bano privado y area de spa interna de uso exclusivo. 57 m2 de puro bienestar para una estancia inolvidable.",
      galleryTitle: "Ciudad de Viterbo",
    },
    de: {
      title: "CHAPLIN Luxury Holiday House",
      subtitle: "Exklusive Suite in Viterbo",
      paragraph1:
        "Eine elegante unabhangige Suite im historischen Zentrum von Viterbo, ideal fur einen Paarurlaub auf der Suche nach Entspannung.",
      paragraph2:
        "Das Ambiente ist raffiniert und bis ins kleinste Detail gepflegt und bietet maximalen Komfort: Schlafbereich, Wohnbereich, ausgestattete Kuche, eigenes Bad und ein interner Spa-Bereich zur exklusiven Nutzung. 57 qm pures Wohlbefinden fur einen unvergesslichen Aufenthalt.",
      galleryTitle: "Stadt Viterbo",
    },
  }

  const content = storyContent[language] || storyContent.it

  const amenities = [
    { icon: Wifi, label: "WiFi Gratis" },
    { icon: Home, label: "Suite Esclusiva" },
    { icon: Utensils, label: "Cucina" },
    { icon: Car, label: "Parcheggio" },
    { icon: KeyRound, label: "Self Check-in" },
    { icon: Snowflake, label: "Aria condiz." },
    { icon: Flame, label: "Riscaldamento" },
  ]

  const galleryImages = [
    { src: "/images/1.jpg", alt: "Interno suite" },
    { src: "/images/2.jpg", alt: "Suite" },
    { src: "/images/pool.jpg", alt: "Piscina privata" },
    { src: "/images/spa1.jpg", alt: "Spa e wellness" },
  ]

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-[#f5f5f0]">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Title Section */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#1a1a1a] mb-3 sm:mb-4 tracking-wide leading-tight"
            style={{ fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif" }}
          >
            {content.title}
          </h2>
          <p className="text-base sm:text-lg text-[#c9a84c] mb-5 sm:mb-6">
            {content.subtitle}
          </p>
          <div className="w-12 sm:w-16 h-0.5 bg-[#c9a84c] mx-auto" />
        </div>

        {/* Content */}
        <div className="mb-12 sm:mb-14">
          <p className="text-[#4a4a4a] text-base sm:text-lg leading-relaxed mb-6 text-center">
            {content.paragraph1}
          </p>
          <p className="text-[#4a4a4a] text-base sm:text-lg leading-relaxed text-center">
            {content.paragraph2}
          </p>
        </div>

        {/* Amenities */}
        <div className="mb-12 sm:mb-14">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {amenities.map((amenity, index) => {
              const Icon = amenity.icon
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#c9a84c] shadow-sm">
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-[#6b6560] max-w-[70px] leading-tight">
                    {amenity.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gallery Section */}
        <div>
          <h3 
            className="text-xl sm:text-2xl text-center text-[#1a1a1a] mb-6 sm:mb-8"
            style={{ fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif" }}
          >
            {content.galleryTitle}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {galleryImages.map((image, index) => (
              <div key={index} className="aspect-square overflow-hidden relative group">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
