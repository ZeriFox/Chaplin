"use client"

import { useEffect, useState } from "react"
import { getAllReviewsPage, type Review } from "@/lib/reviews"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Star, Search } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

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

export default function AllReviewsPage() {
  const { t } = useLanguage()
  const [items, setItems] = useState<Review[]>([])
  const [minRating, setMinRating] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [pageCursor, setPageCursor] = useState<any>(null)
  const [done, setDone] = useState(false)

  const load = async (reset = false) => {
    try {
      setLoading(true)
      const res = await getAllReviewsPage({
        pageSize: 12,
        startAfterDoc: reset ? null : pageCursor,
        minRating: minRating || undefined,
      })

      const newItems = res.items.length ? res.items : reset ? DEFAULT_REVIEWS : []
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]))
      setPageCursor(res.lastDoc)
      setDone(!res.lastDoc && !!res.items.length)
    } catch {
      setItems((prev) => (reset ? DEFAULT_REVIEWS : prev))
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRating])

  return (
    <main className="min-h-screen pt-20 pb-16 container mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-roman-gradient mb-2">{t("allReviews")}</h1>
        <p className="text-muted-foreground">{t("autoUpdatedReviews")}</p>
      </div>

      <div className="flex items-center gap-2 justify-center mb-6">
        <Input
          type="number"
          min={0}
          max={5}
          step="1"
          placeholder={t("filterMinRating")}
          className="w-48"
          value={minRating || ""}
          onChange={(e) => setMinRating(Number(e.target.value || 0))}
        />
        <Button onClick={() => load(true)} variant="secondary">
          <Search className="w-4 h-4 mr-2" /> {t("filter")}
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Card key={r.id} className="card-semi-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < (r.rating ?? 0) ? "fill-[#c9a84c] text-[#c9a84c]" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                {r.source && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground/70">{r.source}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{r.comment}</p>
              <div className="border-t pt-2">
                <p className="font-medium text-sm">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.location}</p>
                {r.date && <p className="text-xs text-muted-foreground mt-0.5">{r.date}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center mt-8">
        {!done ? (
          <Button disabled={loading} onClick={() => load(false)}>
            {loading ? t("loading") : t("loadMore")}
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">{t("allReviewsSeen")}</span>
        )}
      </div>
    </main>
  )
}
