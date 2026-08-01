"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [animationStep, setAnimationStep] = useState(0)
  const { t } = useLanguage()
  const heroSlides = [
    { src: "/images/bb-hero.jpg", alt: "CHAPLIN Holiday House" },
    { src: "/images/pool.jpg", alt: t("homePrivatePoolAlt") },
  ]

  // Staggered animation sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimationStep(1), 300),   // tagline
      setTimeout(() => setAnimationStep(2), 800),   // welcome
      setTimeout(() => setAnimationStep(3), 1300),  // CHAPLIN
      setTimeout(() => setAnimationStep(4), 1800),  // line
      setTimeout(() => setAnimationStep(5), 2300),  // scroll
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 2)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Images with crossfade */}
      {heroSlides.map((slide, index) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: currentSlide === index ? 1 : 0 }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
            className="object-cover"
            sizes="100vw"
            quality={75}
          />
        </div>
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content - centered with staggered animations */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-4">
        
        {/* CHAPLIN */}
        <p 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-[0.15em] uppercase mb-1 transition-all duration-[1200ms] ease-out font-light"
          style={{
            opacity: animationStep >= 1 ? 1 : 0,
            transform: animationStep >= 1 ? "translateY(0)" : "translateY(20px)",
            fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif",
            color: "#c9a84c",
          }}
        >
          CHAPLIN
        </p>

        {/* Luxury Holiday House */}
        <h1 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.08em] mb-1 transition-all duration-[1200ms] ease-out"
          style={{
            opacity: animationStep >= 2 ? 1 : 0,
            transform: animationStep >= 2 ? "translateY(0)" : "translateY(30px)",
            fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif",
            color: "#f5f0e8",
          }}
        >
          Luxury Holiday House
        </h1>

        {/* Viterbo */}
        <p 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-[0.15em] uppercase mb-6 sm:mb-8 transition-all duration-[1200ms] ease-out font-light"
          style={{
            opacity: animationStep >= 3 ? 1 : 0,
            transform: animationStep >= 3 ? "translateY(0)" : "translateY(20px)",
            fontFamily: "var(--font-cormorant), var(--font-playfair), Georgia, serif",
            color: "#c9a84c",
          }}
        >
          Viterbo
        </p>

        {/* Vertical decorative line */}
        <div 
          className="w-px bg-white/50 transition-all duration-[1000ms] ease-out"
          style={{
            height: animationStep >= 4 ? "50px" : "0px",
          }}
        />
      </div>

      {/* Scroll indicator at bottom */}
      <div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-1000"
        style={{ opacity: animationStep >= 5 ? 0.6 : 0 }}
      >
        <span className="text-white/70 text-[10px] tracking-[0.25em] uppercase">scroll</span>
        <div className="w-px h-6 bg-white/30" />
      </div>

      {/* Slide indicators - horizontal lines */}
      <div className="absolute bottom-10 right-6 sm:right-10 flex gap-2">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-0.5 transition-all duration-500 ${
              currentSlide === index ? "w-8 bg-[#c9a84c]" : "w-4 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
