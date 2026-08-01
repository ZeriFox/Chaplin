"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, isSameDay } from "date-fns"
import { de, enUS, es, fr, it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"

export type DateRange = {
  from?: Date
  to?: Date
}

type Props = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  roomId: string
  className?: string
  compact?: boolean
}

type SeasonType = "bassa" | "media" | "medio-alta" | "alta" | "super-alta"

type Season = {
  id: string
  name: string
  type: SeasonType
  startDate: string
  endDate: string
  priceMultiplier: number
  description: string
}

type SpecialPeriod = {
  id: string
  name: string
  startDate: string
  endDate: string
  priceMultiplier: number
  description: string
  priority: number
}

export function BookingCalendarPicker({ value, onChange, roomId, className, compact = false }: Props) {
  const { language, t } = useLanguage()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [seasons, setSeasons] = useState<Season[]>([])
  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] BookingCalendarPicker - Loading data...")
    loadPricingData()
  }, [])

  async function loadPricingData() {
    try {
      setLoading(true)
      console.log("[v0] Loading pricing data...")

      const seasonsRes = await fetch("/api/pricing/seasons")
      const seasonsData = await seasonsRes.json()
      console.log("[v0] Seasons loaded:", seasonsData)
      setSeasons(seasonsData)

      const periodsRes = await fetch("/api/pricing/special-periods")
      const periodsData = await periodsRes.json()
      console.log("[v0] Special periods loaded:", periodsData)
      setSpecialPeriods(periodsData)
    } catch (error) {
      console.error("[v0] Error loading pricing data:", error)
    } finally {
      setLoading(false)
    }
  }

  function getSeasonCategory(date: Date): SeasonType {
    const dateStr = format(date, "yyyy-MM-dd")

    const specialPeriod = specialPeriods.find((p) => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const startParts = p.startDate.split("-")
      const endParts = p.endDate.split("-")

      const start = new Date(
        Number.parseInt(startParts[0]),
        Number.parseInt(startParts[1]) - 1,
        Number.parseInt(startParts[2]),
      )
      const end = new Date(Number.parseInt(endParts[0]), Number.parseInt(endParts[1]) - 1, Number.parseInt(endParts[2]))

      const isInRange = checkDate >= start && checkDate <= end

      if (isInRange) {
        console.log(`[v0] ${dateStr}: Matched special period "${p.name}" (${p.startDate} to ${p.endDate})`)
      }

      return isInRange
    })

    if (specialPeriod) {
      return getPriceCategory(specialPeriod.priceMultiplier)
    }

    const monthDay = format(date, "MM-dd")

    const season = seasons.find((s) => {
      const seasonStart = s.startDate
      const seasonEnd = s.endDate

      if (seasonStart <= seasonEnd) {
        const isInRange = monthDay >= seasonStart && monthDay <= seasonEnd
        if (isInRange) {
          console.log(`[v0] ${dateStr}: Matched season "${s.name}" (${seasonStart} to ${seasonEnd})`)
        }
        return isInRange
      } else {
        const isInRange = monthDay >= seasonStart || monthDay <= seasonEnd
        if (isInRange) {
          console.log(`[v0] ${dateStr}: Matched season "${s.name}" (wrap: ${seasonStart} to ${seasonEnd})`)
        }
        return isInRange
      }
    })

    if (season) {
      return getPriceCategory(season.priceMultiplier)
    }

    console.log(`[v0] ${dateStr}: Base price → media`)
    return "media"
  }

  function getPriceCategory(ratio: number): SeasonType {
    if (ratio >= 2.5) return "super-alta"
    if (ratio >= 1.7) return "alta"
    if (ratio >= 1.3) return "medio-alta"
    if (ratio >= 1.0) return "media"
    return "bassa"
  }

  function getCategoryColor(category: SeasonType): string {
    switch (category) {
      case "super-alta":
        return "bg-red-500"
      case "alta":
        return "bg-orange-500"
      case "medio-alta":
        return "bg-yellow-500"
      case "media":
        return "bg-[#c9a84c]"
      case "bassa":
        return "bg-blue-500"
    }
  }

  function handleDayClick(day: Date) {
    const from = value?.from
    const to = value?.to

    if (!from || (from && to)) {
      onChange?.({ from: day, to: undefined })
    } else if (from && !to) {
      if (day < from) {
        onChange?.({ from: day, to: from })
      } else {
        onChange?.({ from, to: day })
      }
    }
  }

  function isInRange(day: Date): boolean {
    const { from, to } = value || {}
    if (!from) return false
    if (!to) return isSameDay(day, from)
    return day >= from && day <= to
  }

  function isStartOrEnd(day: Date): boolean {
    const { from, to } = value || {}
    if (!from) return false
    if (isSameDay(day, from)) return true
    if (to && isSameDay(day, to)) return true
    return false
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateLocale = { it, en: enUS, fr, es, de }[language]
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    format(new Date(2021, 7, index + 1), "EEE", { locale: dateLocale }),
  )

  return (
    <Card className={cn(compact ? "p-2" : "p-3", className)}>
      <div className={cn(compact ? "space-y-2" : "space-y-3")}>
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size={compact ? "icon" : "sm"}
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            className={compact ? "h-7 w-7" : ""}
            aria-label={t("calendarPreviousMonth")}
          >
            <ChevronLeft className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          </Button>
          <h3 className={cn(compact ? "text-sm" : "text-base", "font-semibold")}>
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </h3>
          <Button
            variant="outline"
            size={compact ? "icon" : "sm"}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={compact ? "h-7 w-7" : ""}
            aria-label={t("calendarNextMonth")}
          >
            <ChevronRight className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          </Button>
        </div>

        {/* Calendar Grid - USER CALENDAR: NO PRICES DISPLAYED */}
        <div className={cn("grid grid-cols-7", compact ? "gap-0.5" : "gap-1")}>
          {weekDays.map((day) => (
            <div key={day} className={cn("text-center font-semibold p-1", compact ? "text-[10px]" : "text-xs")}>
              {day}
            </div>
          ))}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {daysInMonth.map((day) => {
            const isPast = day < today
            const isSelected = isInRange(day)
            const isEdge = isStartOrEnd(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isPast && handleDayClick(day)}
                disabled={isPast}
                className={cn(
                  "rounded-lg text-white text-center transition-all relative flex flex-col items-center justify-center",
                  compact ? "p-2 min-h-[36px]" : "p-4 min-h-[52px]",
                  "bg-primary hover:opacity-80",
                  isPast && "opacity-30 cursor-not-allowed",
                  isSelected && !isEdge && "ring-2 ring-white brightness-110",
                  isEdge && "ring-4 ring-yellow-300 scale-105 brightness-125 shadow-lg shadow-yellow-400/50",
                  !isPast && "cursor-pointer active:scale-95",
                )}
              >
                <div className={cn(compact ? "text-base" : "text-xl", "font-bold")}>{format(day, "d")}</div>
              </button>
            )
          })}
        </div>

        {value?.from && (
          <div
            className={cn(
              "flex items-center gap-2 bg-primary/10 rounded-md p-2 border border-primary/20",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            <CalendarIcon className={cn(compact ? "h-3 w-3" : "h-3 w-3", "text-primary")} />
            <span className="font-semibold">
              {format(value.from, "dd MMM yyyy", { locale: dateLocale })}
              {value.to && ` → ${format(value.to, "dd MMM yyyy", { locale: dateLocale })}`}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
