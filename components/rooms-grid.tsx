"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Bed, Bath, Mountain, Star, Heart, Share2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useDynamicPrice } from "@/hooks/use-dynamic-price"

const SITE_URL = "https://22suite.ekobit.it" as const

const rooms = [

  {
    id: 1,
    name: "intero appartamento  con Vasca Idromassaggio",
    description: "Elegante camera con vasca idromassaggio e arredi di lusso",
    images: ["/images/room-1.jpg", "/images/room-2.jpg"],
    originalPrice: 180,
    guests: 4,
    beds: 2,
    bathrooms: 1,
    size: 33,
    amenities: [
      "Aria condizionata",
      "TV satellitare",
      "Vasca idromassaggio",
      "Asciugacapelli",
      "WiFi gratuito",
      "Minibar",
    ],
    rating: 4.9,
    reviews: 56,
    featured: false,
    available: true,
  },
]

export function RoomsGrid() {
  const { t } = useLanguage()
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const { calculatePrice, loading } = useDynamicPrice()

  const [favorites, setFavorites] = useState<number[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("favoritesRooms")
      return raw ? (JSON.parse(raw) as number[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem("favoritesRooms", JSON.stringify(favorites))
    } catch {}
  }, [favorites])

  const toggleFavorite = (roomId: number) => {
    setFavorites((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  const getRoomUrl = (roomId: number) => `${SITE_URL}/camere/${roomId}`

  const getWhatsAppHref = (room: (typeof rooms)[number]) => {
    const price = calculatePrice(room.id.toString(), today, tomorrow)
    const text = `${t("checkAvailability")}: ${room.name}
${getRoomUrl(room.id)}

${t("pricePerNightLabel")} €${price}${t("perNight")}`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
      {rooms.map((room) => {
        const isFav = favorites.includes(room.id)
        const waHref = getWhatsAppHref(room)
        const price = calculatePrice(room.id.toString(), today, tomorrow)

        return (
          <div
            key={room.id}
            className="card-invisible group overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            <div className="relative overflow-hidden">
              <Image
                src={room.images[0] || "/placeholder.svg"}
                alt={room.name}
                width={400}
                height={300}
                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              />

              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {room.featured && <Badge className="bg-primary text-primary-foreground">{t("mostRequested")}</Badge>}
                {!room.available && <Badge variant="destructive">{t("notAvailable")}</Badge>}
                {room.originalPrice > price && <Badge className="bg-[#c9a84c] text-[#1a1a1a]">{t("specialOffer")}</Badge>}
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toggleFavorite(room.id)}
                  aria-pressed={isFav}
                  aria-label={isFav ? t("removeFromFavorites") : t("addToFavorites")}
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                </Button>

                <Button
                  asChild
                  size="icon"
                  variant="secondary"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("shareOnWhatsApp")}
                >
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <Share2 className="w-4 h-4" />
                  </a>
                </Button>
              </div>

              <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg">
                <div className="text-right">
                  {room.originalPrice > price && (
                    <div className="text-xs line-through opacity-75">€{room.originalPrice}</div>
                  )}
                  <div className="font-bold">
                    €{loading ? "..." : price}
                    {t("perNight")}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {room.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-[#c9a84c] text-[#c9a84c]" />
                  <span className="text-sm font-medium">{room.rating}</span>
                  <span className="text-xs text-muted-foreground">({room.reviews})</span>
                </div>
              </div>

              <p className="text-muted-foreground mb-4 text-sm line-clamp-2">{room.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {room.guests} {t("guests")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>
                    {room.beds} {t("bed")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>
                    {room.bathrooms} {t("bathroom")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Mountain className="w-4 h-4" />
                  <span>{room.size} m²</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild className="flex-1" disabled={!room.available}>
                  <Link href={`/camere/${room.id}`}>{room.available ? t("details") : t("notAvailable")}</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 bg-transparent" disabled={!room.available}>
                  <Link href={`/prenota?room=${room.id}`}>{t("book")}</Link>
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
