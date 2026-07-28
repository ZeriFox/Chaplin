"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Waves, Utensils, Mountain, Dumbbell } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function ServiceCategories() {
  const { t } = useLanguage()

  const categories = [
    {
      icon: Waves,
      name: t("wellnessCategory"),
      description: t("wellnessCategoryDesc"),
      count: 8,
      color: "bg-[#1a1a1a]/10 text-[#1a1a1a]",
    },
    {
      icon: Utensils,
      name: t("gastronomyCategory"),
      description: t("gastronomyCategoryDesc"),
      count: 6,
      color: "bg-[#c9a84c]/15 text-[#c9a84c]",
    },
    {
      icon: Mountain,
      name: t("activitiesCategory"),
      description: t("activitiesCategoryDesc"),
      count: 12,
      color: "bg-[#1a1a1a]/10 text-[#1a1a1a]",
    },
    {
      icon: Dumbbell,
      name: t("fitnessCategory"),
      description: t("fitnessCategoryDesc"),
      count: 4,
      color: "bg-[#c9a84c]/15 text-[#c9a84c]",
    },
  ]

  return (
    <section className="py-12 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">{t("serviceCategories")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("serviceCategoriesDesc")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Card
                key={index}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-foreground">{category.name}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
                  <div className="text-xs text-primary font-medium">
                    {category.count} {t("servicesAvailable")}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
