"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Sparkles,
  MapPin,
  Wifi,
  Car,
  Check,
  Bed,
  Users,
  Maximize,
  Bath,
  Wind,
  Tv,
  Coffee,
  Waves,
  Eye,
  Droplets,
  Sofa,
  Shirt,
  Zap,
  Snowflake,
  WashingMachine,
  Armchair,
  UtensilsCrossed,
  ParkingCircle,
  Refrigerator,
  ChevronLeft,
  ChevronRight,
  X,
  DoorClosed,
  ShieldCheck,
  Languages,
  CalendarClock,
  CigaretteOff,
} from "lucide-react"

type GalleryPhoto = { src: string; alt: string }

export default function CamerePage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()
  const { ref: descRef, isVisible: descVisible } = useScrollAnimation()
  const { t } = useLanguage()

  const HOME = useMemo(
    () => ({
      name: "CHAPLIN Luxury Holiday House",
      location: t("roomLocationLine"),
      guests: 2,
      beds: "1",
      bathrooms: 1,
      size: 57,
      priceLabel: t("roomPriceVariable"),
      description: t("roomDescriptionCurrent"),
      chips: [
        t("entirePlace"),
        "57 m²",
        t("kitchen"),
        t("miniPool"),
        t("freeWifiLower"),
        t("airConditioning"),
        t("privateBathroom"),
        t("dailyCleaning"),
        t("heating"),
      ],
      rules: {
        checkIn: t("checkInFrom15"),
        checkOut: t("checkOutBy11"),
        notes: t("roomCancellationNote"),
      },
    }),
    [t],
  )

  // ✅ FOTO: SOLO ASSET DA /public/chaplin/...
  // Se non trovi un file, mostro placeholder (così non "scompare" tutto).
  const galleryPhotoAlt = (index: number) => `${t("roomGalleryPhotoAlt")} ${index}`
  const photos: GalleryPhoto[] = [
    { src: "/images/pool.jpg", alt: t("roomCoverAlt") },
    { src: "/chaplin/0004.JPG", alt: t("roomSpaAlt") },

  { src: "/chaplin/0007.JPG", alt: t("roomWellnessAreaAlt") },
  { src: "/chaplin/0012.JPG", alt: t("roomMiniPoolAlt") },
  { src: "/chaplin/0013.JPG", alt: t("roomSpaDetailsAlt") },

  { src: "/chaplin/0024.JPG", alt: galleryPhotoAlt(6) },
  { src: "/chaplin/0026.JPG", alt: galleryPhotoAlt(7) },
  { src: "/chaplin/0028.JPG", alt: galleryPhotoAlt(8) },

  { src: "/chaplin/0031.JPG", alt: galleryPhotoAlt(9) },
  { src: "/chaplin/0032.JPG", alt: galleryPhotoAlt(10) },
  { src: "/chaplin/0035.JPG", alt: galleryPhotoAlt(11) },

  { src: "/chaplin/0037.JPG", alt: galleryPhotoAlt(12) },
  { src: "/chaplin/0041.JPG", alt: galleryPhotoAlt(13) },
  { src: "/chaplin/0045.JPG", alt: galleryPhotoAlt(14) },
  { src: "/chaplin/0046.JPG", alt: galleryPhotoAlt(15) },
  { src: "/chaplin/0047.JPG", alt: galleryPhotoAlt(16) },
  { src: "/chaplin/0049.JPG", alt: galleryPhotoAlt(17) },

  { src: "/chaplin/0053.JPG", alt: galleryPhotoAlt(18) },
  { src: "/chaplin/0058.JPG", alt: galleryPhotoAlt(19) },
  { src: "/chaplin/0059.JPG", alt: galleryPhotoAlt(20) },
  { src: "/chaplin/0064.JPG", alt: galleryPhotoAlt(21) },
  { src: "/chaplin/0068.JPG", alt: galleryPhotoAlt(22) },
  { src: "/chaplin/0069.JPG", alt: galleryPhotoAlt(23) },

  { src: "/chaplin/0071.JPG", alt: galleryPhotoAlt(24) },
  { src: "/chaplin/0072.JPG", alt: galleryPhotoAlt(25) },
  { src: "/chaplin/0073.JPG", alt: galleryPhotoAlt(26) },
  { src: "/chaplin/0074.JPG", alt: galleryPhotoAlt(27) },

  { src: "/chaplin/0081.JPG", alt: galleryPhotoAlt(28) },
  { src: "/chaplin/0083.JPG", alt: galleryPhotoAlt(29) },
  { src: "/images/chaplin-kit-cortesia.jpeg", alt: t("courtesyKitAlt") },
  { src: "/images/chaplin-lavabo.jpeg", alt: t("courtesySinkAlt") },
  ]

  const [galleryOpen, setGalleryOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const openGallery = (index: number) => {
    setCurrentImageIndex(index)
    setGalleryOpen(true)
  }

  const nextImage = () => setCurrentImageIndex((p) => (p + 1) % photos.length)
  const prevImage = () => setCurrentImageIndex((p) => (p - 1 + photos.length) % photos.length)

  // ✅ SERVIZI (come già ok)
  const amenities = useMemo(
    () => [
      { icon: DoorClosed, label: t("amenityEntirePlace") },
      { icon: UtensilsCrossed, label: t("amenityCompleteKitchen") },
      { icon: Waves, label: t("amenityCoveredMiniPool") },
      { icon: Sparkles, label: t("amenitySpaRelax") },
      { icon: Wifi, label: t("freeWifiLower") },
      { icon: Wind, label: t("airConditioning") },
      { icon: Snowflake, label: t("heating") },
      { icon: Bath, label: t("privateBathroom") },
      { icon: Check, label: t("dailyCleaning") },
      { icon: CigaretteOff, label: t("amenitySmokeFree") },
      { icon: ParkingCircle, label: t("amenityPublicParking") },
      { icon: Car, label: t("amenityStreetParking") },
      { icon: Tv, label: t("amenityFlatTv") },
      { icon: Coffee, label: t("amenityCoffeeKettle") },
      { icon: Refrigerator, label: t("amenityRefrigerator") },
      { icon: Droplets, label: t("amenityJacuzzi") },
      { icon: ShieldCheck, label: t("amenitySafety") },
      { icon: Languages, label: t("amenityLanguages") },
    ],
    [t],
  )

  // ✅ Verde WhatsApp
  const greenText = "text-[#c9a84c] dark:text-[#d4af37]"
  const greenBorder = "border-[#c9a84c]/20 dark:border-[#c9a84c]/30"
  const greenSoftBg = "bg-[#c9a84c]/10"

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Header />

      {/* ✅ HERO: COME PRIMA (stile “Booking”, senza le card aggiunte) */}
      <section className="pt-20 pb-10 bg-gradient-to-b from-[#c9a84c]/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#c9a84c]/10 rounded-full animate-float" />
          <div
            className="absolute bottom-10 right-20 w-24 h-24 bg-[#c9a84c]/10 rounded-full animate-float"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 right-1/4 w-16 h-16 bg-[#c9a84c]/10 rounded-full animate-float"
            style={{ animationDelay: "2s" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div
              ref={heroRef}
              className={`transition-all duration-1000 ${
                heroVisible ? "animate-slide-in-up opacity-100" : "opacity-0 translate-y-[50px]"
              }`}
            >
              <h1 className="font-cinzel text-4xl md:text-6xl font-bold text-roman-gradient animate-text-shimmer">
                {HOME.name}
              </h1>

              <p className="mt-2 text-sm md:text-base text-muted-foreground flex items-center justify-center gap-2">
                <MapPin className={`w-4 h-4 ${greenText}`} />
                {HOME.location}
              </p>
            </div>

            <div
              ref={descRef}
              className={`transition-all duration-1000 delay-200 ${
                descVisible ? "animate-fade-in-up opacity-100" : "opacity-0 translate-y-[20px]"
              }`}
            >
              <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
                {HOME.description}
              </p>

              {/* ✅ ICONCINE SOTTO (come nella tua foto “vecchia”) */}
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                {[
                  { icon: MapPin, label: t("centerViterbo") },
                  { icon: Wifi, label: t("freeWifiLower") },
                  { icon: Waves, label: t("miniPool") },
                  { icon: Sparkles, label: t("premiumRelax") },
                ].map((f, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full ${greenSoftBg} flex items-center justify-center`}>
                      <f.icon className={`w-6 h-6 ${greenText}`} />
                    </div>
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* ✅ CHIP: come nella tua foto (quelli che non ti piacevano nella versione nuova li ho rimessi semplici) */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {HOME.chips.map((c) => (
                  <span
                    key={c}
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm border ${greenBorder} bg-white/60 dark:bg-black/20`}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENUTO */}
      <section className="py-10 bg-gradient-to-b from-background to-[#c9a84c]/5 overflow-hidden">
        <div className="container mx-auto px-4">
          <Card className={`p-6 shadow-xl border-2 ${greenBorder} bg-white/60 dark:bg-black/20 max-w-6xl mx-auto`}>
            {/* disponibilità */}
            <div className={`mb-6 p-4 rounded-2xl border ${greenBorder} bg-[#c9a84c]/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("availabilityLabel")}</p>
                <p className={`text-lg sm:text-xl font-semibold ${greenText}`}>{HOME.priceLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">{HOME.rules.notes}</p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  asChild
                  variant="outline"
                  className="border-[#c9a84c]/40 hover:border-[#c9a84c] hover:bg-[#c9a84c]/10"
                >
                  <Link href="/contatti">{t("contactButton")}</Link>
                </Button>

                <Button asChild className="bg-[#1a1a1a] hover:bg-[#333] text-[#f5f5f0] shadow-lg">
                  <Link href="/prenota">
                    {t("checkDatesButton")} <Sparkles className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* ✅ FOTO: FIX TOTALE (se non le trova, almeno non si rompe il layout) */}
            <div className="grid grid-cols-12 gap-3">
              {/* grande */}
              <button
                onClick={() => openGallery(0)}
                className={`relative col-span-12 md:col-span-7 aspect-[16/11] overflow-hidden rounded-2xl border ${greenBorder} shadow-sm`}
              >
                <Image
                  src={photos[0]?.src || "/placeholder.svg"}
                  alt={photos[0]?.alt || t("coverLabel")}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 58vw"
                  quality={70}
                  onError={(e) => {
                    // @ts-expect-error next/image fallback
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Badge className="bg-black/60 text-white border-white/10">{t("coverLabel")}</Badge>
                  <Badge className="bg-black/60 text-white border-white/10">+{Math.max(0, photos.length - 1)} {t("photosLabel")}</Badge>
                </div>
              </button>

              {/* 4 piccole */}
              <div className="col-span-12 md:col-span-5 grid grid-cols-2 gap-3">
                {photos.slice(1, 5).map((p, idx) => (
                  <button
                    key={p.src}
                    onClick={() => openGallery(idx + 1)}
                    className={`relative aspect-[16/11] overflow-hidden rounded-2xl border ${greenBorder} shadow-sm`}
                  >
                    <Image
                      src={p.src || "/placeholder.svg"}
                      alt={p.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 21vw"
                      quality={65}
                      onError={(e) => {
                        // @ts-expect-error next/image fallback
                        e.currentTarget.src = "/placeholder.svg"
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* mini stats */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Users, label: t("guestsLabel"), value: HOME.guests },
                { icon: Bed, label: t("bedLabel"), value: HOME.beds },
                { icon: Bath, label: t("bathroomsLabel"), value: HOME.bathrooms },
                { icon: Maximize, label: "m²", value: HOME.size },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${greenBorder} bg-white/60 dark:bg-black/20`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${greenSoftBg} flex items-center justify-center`}>
                      <s.icon className={`w-5 h-5 ${greenText}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-xl font-bold ${greenText}`}>{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* regole */}
            <div className={`mt-6 p-4 rounded-2xl border ${greenBorder} bg-[#c9a84c]/5`}>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <CalendarClock className={`w-5 h-5 ${greenText}`} />
                {t("propertyHoursTitle")}
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <span className="font-medium text-foreground">{t("checkIn")}:</span> {HOME.rules.checkIn}
                </li>
                <li>
                  <span className="font-medium text-foreground">{t("checkOut")}:</span> {HOME.rules.checkOut}
                </li>
              </ul>
            </div>
          </Card>

          {/* Servizi */}
          <Card className={`mt-10 p-8 shadow-2xl bg-white/60 dark:bg-black/20 max-w-6xl mx-auto border-2 ${greenBorder}`}>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <div className={`w-11 h-11 ${greenSoftBg} rounded-full flex items-center justify-center`}>
                <Sparkles className={`w-6 h-6 ${greenText}`} />
              </div>
              {t("houseAmenitiesTitle")}
            </h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {amenities.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-2xl border ${greenBorder} bg-white/50 dark:bg-black/10`}
                >
                  <div className={`w-9 h-9 rounded-full ${greenSoftBg} flex items-center justify-center flex-shrink-0`}>
                    <a.icon className={`w-4 h-4 ${greenText}`} />
                  </div>
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* MODAL */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] w-[95vw] md:w-full p-2 md:p-4 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative w-full h-[60vh] md:h-[72vh] flex items-center justify-center">
              <Image
                src={photos[currentImageIndex]?.src || "/placeholder.svg"}
                alt={photos[currentImageIndex]?.alt || ""}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 95vw, 1024px"
                quality={80}
                priority
              />
            </div>

            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-50 w-9 h-9"
              onClick={() => setGalleryOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-9 h-9"
              onClick={prevImage}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-9 h-9"
              onClick={nextImage}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <Badge className="absolute top-2 left-2 bg-black/70 text-white text-xs px-3 py-1 border-white/10">
              {currentImageIndex + 1} / {photos.length}
            </Badge>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[92vw] pb-1 px-2">
              {photos.map((p, index) => {
                // Only load thumbnails near current image for performance
                const shouldLoad = Math.abs(index - currentImageIndex) <= 5
                return (
                  <button
                    key={p.src}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 ${
                      index === currentImageIndex
                        ? "border-[#c9a84c] shadow-lg scale-110"
                        : "border-white/30 hover:border-white/60"
                    }`}
                  >
                    {shouldLoad ? (
                      <Image 
                        src={p.src} 
                        alt={`${t("roomThumbnailAlt")} ${index + 1}`}
                        fill 
                        className="object-cover" 
                        sizes="64px"
                        quality={50}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/10" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  )
}
