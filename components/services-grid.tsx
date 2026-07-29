"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Star, Phone, Heart, Share2, Sparkles } from "lucide-react"
import { useStaggeredAnimation } from "@/hooks/use-scroll-animation"

type Service = {
  id: number
  category: "Benessere" | "Esperienze" | "Comfort" | "Extra"
  name: string
  description: string
  image: string
  duration: string
  price: number
  capacity: number
  rating: number
  reviews: number
  available: boolean
  popular?: boolean
}

const WHATSAPP_PHONE = "+393517196320" // <-- METTI QUI IL NUMERO DELLA STRUTTURA (formato internazionale, senza +)

function openWhatsApp(service: Service) {
  const text = [
    `Ciao! 😊`,
    `Vorrei prenotare un servizio per *CHAPLIN Luxury Holiday House*.`,
    ``,
    `✅ Servizio: *${service.name}*`,
    `🕒 Durata: ${service.duration}`,
    `👥 Persone: max ${service.capacity}`,
    `💶 Prezzo: €${service.price}`,
    ``,
    `Mi dite disponibilità e come procedere?`,
  ].join("\n")

  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
  window.open(url, "_blank", "noopener,noreferrer")
}

export function ServicesGrid() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutti")
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const { ref, visibleItems } = useStaggeredAnimation(150)

  const services: Service[] = useMemo(
    () => [
      // BENESSERE (plausibile: spa privata, piscina/jacuzzi)
      {
        id: 1,
        category: "Benessere",
        name: "Accesso SPA Privata",
        description:
          "Minipiscina riscaldata ad uso esclusivo per la coppia con atmosfera soft e luci rilassanti. Cromoterapia, idromassaggio professionale",
        image: "/chaplin/services/0013.JPG",
        duration: "Dalle 15:00 alle 3:00",
        price: 40,
        capacity: 2,
        rating: 4.9,
        reviews: 56,
        available: true,
        popular: true,
      },
      {
        id: 2,
        category: "Benessere",
        name: "Jacuzzi & Relax (Uso esclusivo)",
        description:
          "Vasca idromassaggio in esclusiva con atmosfera soft e luci rilassanti. Ideale per coppie.",
        image: "/chaplin/services/0013.JPG",
        duration: "45 min",
        price: 35,
        capacity: 2,
        rating: 4.8,
        reviews: 41,
        available: true,
        popular: true,
      },
      {
        id: 3,
        category: "Benessere",
        name: "Pacchetto Coppia: SPA + Jacuzzi",
        description:
          "Esperienza completa: accesso area benessere + sessione jacuzzi in esclusiva. Massimo relax, zero pensieri.",
        image: "/chaplin/services/couple-package.jpg",
        duration: "90 min",
        price: 65,
        capacity: 2,
        rating: 5.0,
        reviews: 33,
        available: true,
        popular: true,
      },

      // ESPERIENZE (plausibili: setup romantico, aperitivo)
      {
        id: 4,
        category: "Esperienze",
        name: "Aperitivo in Casa (Vino + Tagliere)",
        description:
          "Aperitivo pronto all’arrivo: vino (o analcolico) e tagliere con prodotti locali selezionati. Perfetto per una serata tranquilla.",
        image: "/chaplin/services/wine-board.jpg",
        duration: "—",
        price: 28,
        capacity: 2,
        rating: 4.8,
        reviews: 24,
        available: true,
      },
      {
        id: 5,
        category: "Esperienze",
        name: "Colazione (in casa / self-service)",
        description:
          "Selezione colazione con prodotti confezionati e bevande disponibili in casa (compatibile con check-in serale).",
        image: "/chaplin/services/breakfast.jpg",
        duration: "—",
        price: 12,
        capacity: 2,
        rating: 4.7,
        reviews: 29,
        available: true,
      },
      {
        id: 6,
        category: "Esperienze",
        name: "Allestimento Romantico (Coppia)",
        description:
          "Decorazioni romantiche in casa (petali, luci soft, dettagli a tema). Ideale per anniversari o sorprese.",
        image: "/chaplin/services/romantic-setup.jpg",
        duration: "—",
        price: 25,
        capacity: 2,
        rating: 4.9,
        reviews: 18,
        available: true,
        popular: true,
      },

      // COMFORT (plausibile: late checkout, pulizia extra)
      {
        id: 7,
        category: "Comfort",
        name: "Late Check-out (soggetto a disponibilità)",
        description:
          "Resta più a lungo e goditi la casa senza fretta. Orario esteso concordato in base alle prenotazioni del giorno.",
        image: "/chaplin/services/late-checkout.jpg",
        duration: "+2 ore",
        price: 20,
        capacity: 2,
        rating: 4.6,
        reviews: 22,
        available: true,
      },
      {
        id: 8,
        category: "Comfort",
        name: "Pulizia Extra (su richiesta)",
        description:
          "Pulizia aggiuntiva durante il soggiorno con cambio biancheria (se disponibile). Consigliata per soggiorni più lunghi.",
        image: "/chaplin/services/cleaning.jpg",
        duration: "—",
        price: 18,
        capacity: 2,
        rating: 4.7,
        reviews: 17,
        available: true,
      },
    ],
    [],
  )

  const categories = ["Tutti", "Benessere", "Esperienze", "Comfort", "Extra"]

  const filteredServices =
    selectedCategory === "Tutti" ? services : services.filter((s) => s.category === selectedCategory)

  const toggleFavorite = (serviceId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      next.has(serviceId) ? next.delete(serviceId) : next.add(serviceId)
      return next
    })
  }

  return (
    <section className="py-16 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        {/* Category Filter (verde WhatsApp) */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          {categories.map((category, index) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-7 py-3 text-base font-medium transition-all duration-300 hover:scale-105 ${
                selectedCategory === category
                  ? "bg-[#1a1a1a] hover:bg-[#333] text-[#f5f5f0] shadow-lg"
                  : "border-[#c9a84c]/40 hover:bg-[#c9a84c]/10"
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Services Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredServices.map((service, index) => (
            <div
              key={service.id}
              data-index={index}
              className={`group overflow-hidden rounded-2xl border border-[#c9a84c]/20 dark:border-[#c9a84c]/20 bg-white/60 dark:bg-black/20 backdrop-blur card-invisible transition-all duration-500 hover:shadow-2xl ${
                visibleItems.has(index) ? "animate-fade-in-up" : "opacity-0 translate-y-10"
              }`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="relative overflow-hidden">
                <Image
                  src={service.image || "/placeholder.svg"}
                  alt={service.name}
                  width={400}
                  height={300}
                  className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge className="bg-[#1a1a1a]/90 text-white text-sm font-medium backdrop-blur-sm">
                    {service.category}
                  </Badge>

                  {service.popular && (
                    <Badge className="bg-gradient-to-r from-[#c9a84c] to-[#d4af37] text-white text-sm font-medium">
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> Consigliato
                    </Badge>
                  )}

                  {!service.available && (
                    <Badge variant="destructive" className="text-sm backdrop-blur-sm">
                      Non Disponibile
                    </Badge>
                  )}
                </div>

                {/* Price */}
                {service.id !== 1 && (
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-lg font-bold border border-white/20">
                    €{service.price}
                  </div>
                )}

                {/* Action buttons overlay */}
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/20"
                    onClick={() => toggleFavorite(service.id)}
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(service.id) ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/20"
                    onClick={() => {
                      const shareText = `${service.name} — €${service.price} (${service.duration})`
                      navigator.clipboard?.writeText?.(shareText)
                    }}
                    title="Copia info servizio"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-xl text-foreground group-hover:text-[#c9a84c] transition-colors line-clamp-2 leading-tight">
                    {service.name}
                  </h3>

                  <div className="flex items-center gap-1 ml-3 bg-[#c9a84c]/10 px-2 py-1 rounded-full border border-[#c9a84c]/20">
                    <Star className="w-4 h-4 fill-[#c9a84c] text-[#c9a84c]" />
                    <span className="text-sm font-bold">{service.rating}</span>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">{service.description}</p>

                {/* Details */}
                {service.id === 1 ? (
                  <div className="flex items-center gap-2 bg-[#c9a84c]/10 rounded-lg px-3 py-2 border border-[#c9a84c]/20 mb-5 text-sm">
                    <Clock className="w-4 h-4 text-[#c9a84c]" />
                    <span className="font-medium">{service.duration}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                    <div className="flex items-center gap-2 bg-[#c9a84c]/10 rounded-lg px-3 py-2 border border-[#c9a84c]/20">
                      <Clock className="w-4 h-4 text-[#c9a84c]" />
                      <span className="font-medium">{service.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#c9a84c]/10 rounded-lg px-3 py-2 border border-[#c9a84c]/20">
                      <Users className="w-4 h-4 text-[#c9a84c]" />
                      <span className="font-medium">Max {service.capacity}</span>
                    </div>
                  </div>
                )}

                {/* Reviews */}
                <div className="text-xs text-muted-foreground mb-4">
                  {service.reviews} recensioni • Valutazione media {service.rating}/5
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    className={`flex-1 text-sm font-medium transition-all duration-300 ${
                      service.available ? "bg-[#1a1a1a] hover:bg-[#333] text-[#f5f5f0] shadow-lg" : ""
                    }`}
                    disabled={!service.available}
                    onClick={() => service.available && openWhatsApp(service)}
                  >
                    {service.available ? "Prenota su WhatsApp" : "Non Disponibile"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="px-4 bg-transparent border-emerald-300/70 hover:bg-[#c9a84c]/10 transition-all duration-300"
                    onClick={() => openWhatsApp(service)}
                    title="Contatta su WhatsApp"
                  >
                    <Phone className="w-4 h-4 text-[#c9a84c]" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-xl">Nessun servizio trovato per la categoria selezionata.</p>
          </div>
        )}
      </div>
    </section>
  )
}
