"use client"

import { useEffect, useState } from "react"
import type { Review } from "@/lib/reviews"
import { getTop4Reviews } from "@/lib/reviews"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

type Props = {
  className?: string
  title?: string
  subtitle?: string
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "d1",
    name: "Marco Rossi",
    location: "Milano",
    rating: 5,
    comment: "Esperienza fantastica! Il servizio è impeccabile e la vista mozzafiato. Torneremo sicuramente!",
    date: "Dicembre 2024",
    verified: true,
    source: "default",
  },
  {
    id: "d2",
    name: "Sarah Johnson",
    location: "London, UK",
    rating: 5,
    comment:
      "Perfect location in Rome! The staff was incredibly helpful and the rooms are beautiful. Highly recommended!",
    date: "Novembre 2024",
    verified: true,
    source: "default",
  },
  {
    id: "d3",
    name: "Giuseppe Bianchi",
    location: "Roma",
    rating: 4,
    comment: "Ottima struttura nel cuore di Roma. Colazione eccellente e personale molto cortese.",
    date: "Ottobre 2024",
    verified: true,
    source: "default",
  },
  {
    id: "d4",
    name: "Marie Dubois",
    location: "Paris, France",
    rating: 5,
    comment: "Un séjour merveilleux! L'emplacement est parfait pour visiter Rome et le service est exceptionnel.",
    date: "Settembre 2024",
    verified: true,
    source: "default",
  },
]

function getSourceBadgeClass(source?: string) {
  switch (source) {
    case "booking":
      return "bg-blue-600 text-white"
    case "airbnb":
      return "bg-pink-600 text-white"
    default:
      return "bg-[#c9a84c]/15 text-[#1a1a1a]"
  }
}

export default function ReviewsSection({ className }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    ;(async () => {
      try {
        const top = await getTop4Reviews()
        setReviews(top.length ? top : DEFAULT_REVIEWS)
      } catch {
        setReviews(DEFAULT_REVIEWS)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <section className={className}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-cinzel font-bold text-roman-gradient mb-4">{t("reviewsTitle")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("reviewsDescription")}</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border border-border animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {reviews.map((review) => (
            <Card key={review.id} className="card-semi-transparent hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < (review.rating ?? 0) ? "fill-[#c9a84c] text-[#c9a84c]" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  {review.verified && (
                    <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${getSourceBadgeClass(review.source)}`}>
                      {review.source === "booking"
                        ? "Booking.com"
                        : review.source === "airbnb"
                          ? "Airbnb"
                          : t("verified")}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-3">{review.comment}</p>

                <div className="border-t pt-2">
                  <p className="font-medium text-sm">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.location}</p>
                  {review.date && <p className="text-xs text-muted-foreground mt-0.5">{review.date}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">4.8</div>
            <div className="flex items-center justify-center gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-[#c9a84c] text-[#c9a84c]" />
              ))}
            </div>
            <div className="text-xs text-muted-foreground">{t("averageRating")}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">250+</div>
            <div className="text-xs text-muted-foreground">{t("totalReviews")}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">98%</div>
            <div className="text-xs text-muted-foreground">{t("satisfaction")}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">85%</div>
            <div className="text-xs text-muted-foreground">{t("returnRate")}</div>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="bg-transparent hover:bg-primary/10">
          <Link href="/recensioni">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("readAllReviews")}
          </Link>
        </Button>
      </div>
    </section>
  )
}
