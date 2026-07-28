"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Bed, Bath, Mountain, Star } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useRoomPrices } from "@/hooks/use-room-prices"

const relatedRooms = [

  {
    id: 1,
    roomId: "1",
    name: "Luxury Holiday House",
    description: "Luxury Holiday House con piscina privata",
    image: "/images/room-1.jpg",
    guests: 2,
    beds: 1,
    bathrooms: 1,
    size: 30,
    rating: 4.9,
    reviews: 45,
    available: true,
  },
]

interface RelatedRoomsProps {
  currentRoomId: string
}

export function RelatedRooms({ currentRoomId }: RelatedRoomsProps) {
  const { t } = useLanguage()
  const { prices, loading } = useRoomPrices()

  const filteredRooms = relatedRooms.filter((room) => room.id.toString() !== currentRoomId)

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">{t("otherRoomsAvailable")}</h2>
        <p className="text-muted-foreground text-lg">{t("discoverOtherRooms")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {filteredRooms.map((room) => {
          const roomPrice = prices[room.roomId] || 0
          const priceDisplay = loading ? "..." : roomPrice

          return (
            <Card key={room.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="relative overflow-hidden">
                <Image
                  src={room.image || "/placeholder.svg"}
                  alt={room.name}
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg">
                  <div className="text-right">
                    <div className="font-bold">
                      €{priceDisplay}
                      {t("perNight")}
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
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
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center mt-8">
        <Button asChild variant="outline" size="lg">
          <Link href="/camere">{t("viewAllRooms")}</Link>
        </Button>
      </div>
    </div>
  )
}
