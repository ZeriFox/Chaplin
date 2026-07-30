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
  mosaicImages?: string[]
  duration: string
  price: number
  capacity: number
  rating: number
  reviews: number
  available: boolean
  popular?: boolean
  draft?: boolean
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
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const { ref, visibleItems } = useStaggeredAnimation(150)

  const services: Service[] = useMemo(
    () => [
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
      {
        id: 7,
        category: "Esperienze",
        name: "Nuovo servizio",
        description: "Titolo e descrizione in aggiornamento.",
        image: "/images/service-mosaic-vino-giallo.jpeg",
        mosaicImages: [
          "/images/service-mosaic-vino-giallo.jpeg",
          "/images/service-mosaic-frutta-mista.jpeg",
          "/images/service-mosaic-ananas.jpeg",
          "/images/service-mosaic-vino-rosa.jpeg",
        ],
        duration: "",
        price: 0,
        capacity: 2,
        rating: 0,
        reviews: 0,
        available: false,
        draft: true,
      },
    ],
    [],
  )

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
        {/* Services Grid */}
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div
              key={service.id}
              data-index={index}
              className={`group overflow-hidden rounded-2xl border border-[#c9a84c]/20 dark:border-[#c9a84c]/20 bg-white/60 dark:bg-black/20 backdrop-blur card-invisible transition-all duration-500 hover:shadow-2xl ${
                visibleItems.has(index) ? "animate-fade-in-up" : "opacity-0 translate-y-10"
              }`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="relative overflow-hidden">
                {service.mosaicImages ? (
                  <div className="grid h-56 grid-cols-2 grid-rows-2 gap-0.5 bg-[#1a1a1a]">
                    {service.mosaicImages.map((image, imageIndex) => (
                      <div key={image} className="relative overflow-hidden">
                        <Image
                          src={image}
                          alt={`${service.name} - dettaglio ${imageIndex + 1}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 200px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Image
                    src={service.image || "/placeholder.svg"}
                    alt={service.name}
                    width={400}
                    height={300}
                    className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <Badge className="bg-[#1a1a1a]/90 text-white text-sm font-medium backdrop-blur-sm">
                    {service.category}
                  </Badge>

                  {service.popular && (
                    <Badge className="bg-gradient-to-r from-[#c9a84c] to-[#d4af37] text-white text-sm font-medium">
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> {service.id === 1 ? "Incluso" : "Consigliato"}
                    </Badge>
                  )}

                  {service.draft ? (
                    <Badge className="bg-white/90 text-[#1a1a1a] text-sm backdrop-blur-sm">In arrivo</Badge>
                  ) : !service.available ? (
                    <Badge variant="destructive" className="text-sm backdrop-blur-sm">
                      Non Disponibile
                    </Badge>
                  ) : null}
                </div>

                {/* Price */}
                {service.id !== 1 && !service.draft && (
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-full text-lg font-bold border border-white/20">
                    €{service.price}
                  </div>
                )}

                {/* Action buttons overlay */}
                {!service.draft && (
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
                )}
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-xl text-foreground group-hover:text-[#c9a84c] transition-colors line-clamp-2 leading-tight">
                    {service.name}
                  </h3>

                  {!service.draft && (
                    <div className="flex items-center gap-1 ml-3 bg-[#c9a84c]/10 px-2 py-1 rounded-full border border-[#c9a84c]/20">
                      <Star className="w-4 h-4 fill-[#c9a84c] text-[#c9a84c]" />
                      <span className="text-sm font-bold">{service.rating}</span>
                    </div>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 leading-relaxed">{service.description}</p>

                {/* Details */}
                {service.id === 1 && (
                  <div className="flex items-center gap-2 bg-[#c9a84c]/10 rounded-lg px-3 py-2 border border-[#c9a84c]/20 mb-5 text-sm">
                    <Clock className="w-4 h-4 text-[#c9a84c]" />
                    <span className="font-medium">{service.duration}</span>
                  </div>
                )}

                {/* Reviews */}
                {!service.draft && (
                  <div className="text-xs text-muted-foreground mb-4">
                    {service.reviews} recensioni • Valutazione media {service.rating}/5
                  </div>
                )}

                {/* Actions */}
                {service.draft ? (
                  <Button size="sm" className="w-full text-sm font-medium" disabled>
                    Dettagli in arrivo
                  </Button>
                ) : (
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
                )}
              </div>
            </div>
          ))}
        </div>

        {services.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-xl">Nessun servizio trovato per la categoria selezionata.</p>
          </div>
        )}
      </div>
    </section>
  )
}
