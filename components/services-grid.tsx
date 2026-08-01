"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Star, Phone, Heart, Share2, Sparkles } from "lucide-react"
import { useStaggeredAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"

type Service = {
  id: number
  category: string
  name: string
  description: string
  image: string
  mosaicImages?: string[]
  duration: string
  price: number | null
  capacity: number
  rating: number
  reviews: number
  available: boolean
  popular?: boolean
  draft?: boolean
}

const WHATSAPP_PHONE = "393517196320"

function openWhatsApp(service: Service, t: (key: string) => string) {
  const text = [
    t("whatsappGreeting"),
    t("whatsappServiceRequest"),
    ``,
    `✅ ${t("whatsappServiceLabel")}: *${service.name}*`,
    ...(service.duration ? [`🕒 ${t("whatsappDurationLabel")}: ${service.duration}`] : []),
    `👥 ${t("whatsappPeopleLabel")}: max ${service.capacity}`,
    ...(service.price === null ? [] : [`💶 ${t("whatsappPriceLabel")}: €${service.price}`]),
    ``,
    t("whatsappAvailabilityQuestion"),
  ].join("\n")

  const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
  window.open(url, "_blank", "noopener,noreferrer")
}

export function ServicesGrid() {
  const { t } = useLanguage()
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const { ref, visibleItems } = useStaggeredAnimation(150)

  const services: Service[] = useMemo(
    () => [
      {
        id: 1,
        category: t("categoryWellness"),
        name: t("privateSpaAccessTitle"),
        description: t("privateSpaAccessDescription"),
        image: "/chaplin/services/0013.JPG",
        duration: t("privateSpaSchedule"),
        price: 40,
        capacity: 2,
        rating: 4.9,
        reviews: 56,
        available: true,
        popular: true,
      },
      {
        id: 6,
        category: t("categoryExperiences"),
        name: t("romanticSetupTitle"),
        description: t("romanticSetupDescription"),
        image: "/chaplin/services/romantic-setup.jpg",
        duration: "—",
        price: null,
        capacity: 2,
        rating: 4.9,
        reviews: 18,
        available: true,
        popular: true,
      },
      {
        id: 7,
        category: t("categoryExperiences"),
        name: t("silverSpaTitle"),
        description: t("silverSpaDescription"),
        image: "/images/service-mosaic-vino-giallo.jpeg",
        mosaicImages: [
          "/images/service-mosaic-vino-giallo.jpeg",
          "/images/service-mosaic-frutta-mista.jpeg",
          "/images/service-mosaic-ananas.jpeg",
          "/images/service-mosaic-vino-rosa.jpeg",
        ],
        duration: "",
        price: 59,
        capacity: 2,
        rating: 0,
        reviews: 0,
        available: true,
        popular: true,
      },
    ],
    [t],
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
                          alt={`${service.name} - ${t("photoDetailLabel")} ${imageIndex + 1}`}
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
                    <Badge
                      className={
                        service.id === 7
                          ? "border border-white/20 bg-[#1a1a1a]/90 text-white text-sm font-medium backdrop-blur-sm"
                          : "bg-gradient-to-r from-[#c9a84c] to-[#d4af37] text-white text-sm font-medium"
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" /> {service.id === 1 ? t("includedLabel") : t("recommendedLabel")}
                    </Badge>
                  )}

                  {service.draft ? (
                    <Badge className="bg-white/90 text-[#1a1a1a] text-sm backdrop-blur-sm">{t("comingSoonLabel")}</Badge>
                  ) : !service.available ? (
                    <Badge variant="destructive" className="text-sm backdrop-blur-sm">
                      {t("unavailableLabel")}
                    </Badge>
                  ) : null}
                </div>

                {/* Price */}
                {service.id !== 1 && service.price !== null && !service.draft && (
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
                        const priceText = service.price === null ? "" : ` — €${service.price}`
                        const shareText = `${service.name}${priceText} (${service.duration})`
                        navigator.clipboard?.writeText?.(shareText)
                      }}
                      title={t("copyServiceInfo")}
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

                  {!service.draft && service.rating > 0 && (
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
                {!service.draft && service.reviews > 0 && (
                  <div className="text-xs text-muted-foreground mb-4">
                    {service.reviews} {t("reviewsLabel")} • {t("averageRatingLabel")} {service.rating}/5
                  </div>
                )}

                {/* Actions */}
                {service.draft ? (
                  <Button size="sm" className="w-full text-sm font-medium" disabled>
                    {t("detailsComingSoon")}
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      className={`flex-1 text-sm font-medium transition-all duration-300 ${
                        service.available ? "bg-[#1a1a1a] hover:bg-[#333] text-[#f5f5f0] shadow-lg" : ""
                      }`}
                      disabled={!service.available}
                      onClick={() => service.available && openWhatsApp(service, t)}
                    >
                      {service.available ? t("bookOnWhatsApp") : t("unavailableLabel")}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="px-4 bg-transparent border-emerald-300/70 hover:bg-[#c9a84c]/10 transition-all duration-300"
                      onClick={() => openWhatsApp(service, t)}
                      title={t("contactOnWhatsApp")}
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
            <p className="text-muted-foreground text-xl">{t("noServicesFound")}</p>
          </div>
        )}
      </div>
    </section>
  )
}

