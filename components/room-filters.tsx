"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, X, Users, Euro, Star } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function RoomFilters() {
  const { t } = useLanguage()

  const [isOpen, setIsOpen] = useState(false)
  const [priceRange, setPriceRange] = useState([100, 300])
  const [guests, setGuests] = useState("")
  const [rating, setRating] = useState("")
  const [amenities, setAmenities] = useState<string[]>([])

  const amenityOptions = [
    t("panoramicView"),
    t("privateBalcony"),
    t("freeWifi"),
    t("airConditioning"),
    t("minibar"),
    t("satelliteTV"),
    t("jacuzzi"),
    t("privatePatio"),
  ]

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]))
  }

  const clearFilters = () => {
    setPriceRange([100, 300])
    setGuests("")
    setRating("")
    setAmenities([])
  }

  const activeFiltersCount =
    (priceRange[0] !== 100 || priceRange[1] !== 300 ? 1 : 0) + (guests ? 1 : 0) + (rating ? 1 : 0) + amenities.length

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          {t("filters")}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="text-sm">
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(priceRange[0] !== 100 || priceRange[1] !== 300) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Euro className="w-3 h-3" />€{priceRange[0]} - €{priceRange[1]}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange([100, 300])} />
            </Badge>
          )}
          {guests && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {guests} {t("guests")}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setGuests("")} />
            </Badge>
          )}
          {rating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {rating}+ {t("stars")}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setRating("")} />
            </Badge>
          )}
          {amenities.map((amenity) => (
            <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
              {amenity}
              <X className="w-3 h-3 cursor-pointer" onClick={() => toggleAmenity(amenity)} />
            </Badge>
          ))}
        </div>
      )}

      {isOpen && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium mb-3 block">{t("pricePerNight")}</label>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={500}
                    min={50}
                    step={10}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>€{priceRange[0]}</span>
                    <span>€{priceRange[1]}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">{t("numberOfGuests")}</label>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectGuests")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 {t("guest")}</SelectItem>
                    <SelectItem value="2">2 {t("guests")}</SelectItem>
                    <SelectItem value="3">3 {t("guests")}</SelectItem>
                    <SelectItem value="4">4+ {t("guests")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">{t("minRating")}</label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectRating")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4.5">4.5+ {t("stars")}</SelectItem>
                    <SelectItem value="4.0">4.0+ {t("stars")}</SelectItem>
                    <SelectItem value="3.5">3.5+ {t("stars")}</SelectItem>
                    <SelectItem value="3.0">3.0+ {t("stars")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">{t("amenities")}</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {amenityOptions.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={amenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <label
                        htmlFor={amenity}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
