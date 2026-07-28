"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ServicesGrid } from "@/components/services-grid"
import { ServiceCategories } from "@/components/service-categories"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useLanguage } from "@/components/language-provider"

export default function ServiziPage() {
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation()
  const { ref: categoriesRef, isVisible: categoriesVisible } = useScrollAnimation()
  const { t } = useLanguage()

  return (
    <main className="min-h-screen">
      <Header />

      {/* Enhanced Hero Section */}
      <section
        ref={heroRef}
        className="pt-24 pb-16 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/10 relative overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div
            className={`text-center max-w-5xl mx-auto transition-all duration-1000 ${heroVisible ? "animate-fade-in-up" : "opacity-0 translate-y-10"}`}
          >
            <h1 className="font-roman text-5xl md:text-7xl font-bold text-roman-gradient mb-8 animate-shimmer">
              {t("servicesPageTitle")}
            </h1>
            <p className="text-2xl md:text-3xl text-muted-foreground text-balance mb-8 font-light">
              {t("servicesPageSubtitle")}
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed">
              {t("servicesPageDescription")}
            </p>
          </div>
        </div>
      </section>

      {/* Service Categories with animations */}
      <div
        ref={categoriesRef}
        className={`transition-all duration-1000 ${categoriesVisible ? "animate-slide-in-up" : "opacity-0 translate-y-10"}`}
      >
        <ServiceCategories />
      </div>

      {/* Services Grid */}
      <ServicesGrid />

      <Footer />
    </main>
  )
}
