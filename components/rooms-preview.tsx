"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, Plane, Train } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function RoomsPreview() {
  const { language } = useLanguage()

  const sectionContent: Record<string, {
    locationTitle: string
    address: string
    airportsTitle: string
    stationsTitle: string
    nearbyTitle: string
    mapBtn: string
    airports: { name: string; distance: string }[]
    stations: { name: string; distance: string }[]
    nearby: { name: string; distance: string }[]
  }> = {
    it: {
      locationTitle: "Dove Siamo",
      address: "Via della Pettinara 48, 01100 Viterbo (VT), Italia",
      airportsTitle: "Aeroporti",
      stationsTitle: "Stazioni Ferroviarie",
      nearbyTitle: "Nelle vicinanze",
      mapBtn: "Vedi su Google Maps",
      airports: [
        { name: "Aeroporto di Roma Fiumicino (FCO)", distance: "118 km" },
        { name: "Aeroporto di Roma Ciampino (CIA)", distance: "118 km" },
      ],
      stations: [
        { name: "Stazione Viterbo Porta Romana", distance: "1.5 km" },
        { name: "Stazione Viterbo Porta Fiorentina", distance: "700 mt" },
      ],
      nearby: [
        { name: "Rocca Albornoz", distance: "350 mt" },
        { name: "Piazza Verdi", distance: "0.4 km" },
        { name: "Santuario di Santa Rosa", distance: "0.5 km" },
        { name: "Corso Italia", distance: "0.7 km" },
        { name: "Piazza del Plebiscito", distance: "0.6 km" },
        { name: "Quartiere Medievale San Pellegrino", distance: "1 km" },
        { name: "Palazzo dei Papi", distance: "0.8 km" },
        { name: "Civita di Bagnoregio", distance: "30 km" },
      ],
    },
    en: {
      locationTitle: "Where We Are",
      address: "Via della Pettinara 48, 01100 Viterbo (VT), Italy",
      airportsTitle: "Airports",
      stationsTitle: "Train Stations",
      nearbyTitle: "Nearby",
      mapBtn: "View on Google Maps",
      airports: [
        { name: "Rome Fiumicino Airport (FCO)", distance: "118 km" },
        { name: "Rome Ciampino Airport (CIA)", distance: "118 km" },
      ],
      stations: [
        { name: "Viterbo Porta Romana Station", distance: "1.5 km" },
        { name: "Viterbo Porta Fiorentina Station", distance: "700 mt" },
      ],
      nearby: [
        { name: "Rocca Albornoz", distance: "350 mt" },
        { name: "Piazza Verdi", distance: "0.4 km" },
        { name: "Sanctuary of Santa Rosa", distance: "0.5 km" },
        { name: "Corso Italia", distance: "0.7 km" },
        { name: "Piazza del Plebiscito", distance: "0.6 km" },
        { name: "Medieval San Pellegrino Quarter", distance: "1 km" },
        { name: "Papal Palace", distance: "0.8 km" },
        { name: "Civita di Bagnoregio", distance: "30 km" },
      ],
    },
    fr: {
      locationTitle: "Ou Nous Sommes",
      address: "Via della Pettinara 48, 01100 Viterbo (VT), Italie",
      airportsTitle: "Aeroports",
      stationsTitle: "Gares",
      nearbyTitle: "A proximite",
      mapBtn: "Voir sur Google Maps",
      airports: [
        { name: "Aeroport de Rome Fiumicino (FCO)", distance: "118 km" },
        { name: "Aeroport de Rome Ciampino (CIA)", distance: "118 km" },
      ],
      stations: [
        { name: "Gare Viterbo Porta Romana", distance: "1.5 km" },
        { name: "Gare Viterbo Porta Fiorentina", distance: "700 mt" },
      ],
      nearby: [
        { name: "Rocca Albornoz", distance: "350 mt" },
        { name: "Piazza Verdi", distance: "0.4 km" },
        { name: "Sanctuaire de Santa Rosa", distance: "0.5 km" },
        { name: "Corso Italia", distance: "0.7 km" },
        { name: "Piazza del Plebiscito", distance: "0.6 km" },
        { name: "Quartier medieval San Pellegrino", distance: "1 km" },
        { name: "Palais des Papes", distance: "0.8 km" },
        { name: "Civita di Bagnoregio", distance: "30 km" },
      ],
    },
    es: {
      locationTitle: "Donde Estamos",
      address: "Via della Pettinara 48, 01100 Viterbo (VT), Italia",
      airportsTitle: "Aeropuertos",
      stationsTitle: "Estaciones de tren",
      nearbyTitle: "Cerca",
      mapBtn: "Ver en Google Maps",
      airports: [
        { name: "Aeropuerto de Roma Fiumicino (FCO)", distance: "118 km" },
        { name: "Aeropuerto de Roma Ciampino (CIA)", distance: "118 km" },
      ],
      stations: [
        { name: "Estacion Viterbo Porta Romana", distance: "1.5 km" },
        { name: "Estacion Viterbo Porta Fiorentina", distance: "700 mt" },
      ],
      nearby: [
        { name: "Rocca Albornoz", distance: "350 mt" },
        { name: "Piazza Verdi", distance: "0.4 km" },
        { name: "Santuario de Santa Rosa", distance: "0.5 km" },
        { name: "Corso Italia", distance: "0.7 km" },
        { name: "Piazza del Plebiscito", distance: "0.6 km" },
        { name: "Barrio medieval San Pellegrino", distance: "1 km" },
        { name: "Palacio de los Papas", distance: "0.8 km" },
        { name: "Civita di Bagnoregio", distance: "30 km" },
      ],
    },
    de: {
      locationTitle: "Wo Wir Sind",
      address: "Via della Pettinara 48, 01100 Viterbo (VT), Italien",
      airportsTitle: "Flughafen",
      stationsTitle: "Bahnhofe",
      nearbyTitle: "In der Nahe",
      mapBtn: "Auf Google Maps ansehen",
      airports: [
        { name: "Flughafen Rom Fiumicino (FCO)", distance: "118 km" },
        { name: "Flughafen Rom Ciampino (CIA)", distance: "118 km" },
      ],
      stations: [
        { name: "Bahnhof Viterbo Porta Romana", distance: "1.5 km" },
        { name: "Bahnhof Viterbo Porta Fiorentina", distance: "700 mt" },
      ],
      nearby: [
        { name: "Rocca Albornoz", distance: "350 mt" },
        { name: "Piazza Verdi", distance: "0.4 km" },
        { name: "Heiligtum der Santa Rosa", distance: "0.5 km" },
        { name: "Corso Italia", distance: "0.7 km" },
        { name: "Piazza del Plebiscito", distance: "0.6 km" },
        { name: "Mittelalterliches Viertel San Pellegrino", distance: "1 km" },
        { name: "Papstpalast", distance: "0.8 km" },
        { name: "Civita di Bagnoregio", distance: "30 km" },
      ],
    },
  }

  const content = sectionContent[language] || sectionContent.it

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-[#f5f5f0]">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Title with Address */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl font-normal text-[#1a1a1a] mb-4 tracking-wide"
            style={{ fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif" }}
          >
            {content.locationTitle}
          </h2>
          <div className="w-12 sm:w-16 h-0.5 bg-[#c9a84c] mx-auto mb-4" />
          <p className="text-[#6b6560] flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-[#c9a84c]" />
            {content.address}
          </p>
        </div>

        {/* Location Info Grid */}
        <div className="flex flex-col gap-10 mb-12">
          {/* Top - Nearby */}
          <div>
            <h4 className="text-sm font-medium text-[#1a1a1a] mb-4">
              {content.nearbyTitle}
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {content.nearby.map((place, index) => (
                <li key={index} className="flex justify-between text-sm text-[#6b6560] py-2 border-b border-[#e0ddd5]">
                  <span>{place.name}</span>
                  <span className="text-[#c9a84c] font-medium">{place.distance}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom - Airports & Stations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Airports */}
            <div>
              <h4 className="text-sm font-medium text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#c9a84c]" />
                {content.airportsTitle}
              </h4>
              <ul className="space-y-2">
                {content.airports.map((airport, index) => (
                  <li key={index} className="flex justify-between text-sm text-[#6b6560]">
                    <span>{airport.name}</span>
                    <span className="text-[#c9a84c] font-medium">{airport.distance}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Train Stations */}
            <div>
              <h4 className="text-sm font-medium text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Train className="w-4 h-4 text-[#c9a84c]" />
                {content.stationsTitle}
              </h4>
              <ul className="space-y-2">
                {content.stations.map((station, index) => (
                  <li key={index} className="flex justify-between text-sm text-[#6b6560]">
                    <span>{station.name}</span>
                    <span className="text-[#c9a84c] font-medium">{station.distance}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Map Button */}
        <div className="relative h-64 sm:h-80 overflow-hidden bg-[#e0ddd5]">
          <Image
            src="/images/bb-hero.jpg"
            alt="CHAPLIN Location"
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              asChild
              className="bg-[#1a1a1a] hover:bg-[#333] text-white rounded-none px-8 py-5"
            >
              <Link 
                href="https://maps.google.com/?q=Via+della+Pettinara+48,+01100+Viterbo+VT,+Italia" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MapPin className="w-4 h-4 mr-2" />
                {content.mapBtn}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
