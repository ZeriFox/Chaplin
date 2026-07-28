"use client"

import * as React from "react"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { it, enGB, fr, es, de } from "date-fns/locale"

type Props = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  className?: string
  langCode?: "it" | "en" | "fr" | "es" | "de"
}

const mapLocale = (code?: Props["langCode"]) => {
  switch (code) {
    case "en": return enGB
    case "fr": return fr
    case "es": return es
    case "de": return de
    default:   return it
  }
}

export default function DateRangePicker({ value, onChange, className, langCode = "it" }: Props) {
  const [open, setOpen] = React.useState(false)
  const from = value?.from
  const to = value?.to
  const locale = mapLocale(langCode)

  const label =
    from && to
      ? `${format(from, "dd MMM yyyy", { locale })} – ${format(to, "dd MMM yyyy", { locale })}`
      : from
      ? `${format(from, "dd MMM yyyy", { locale })} – …`
      : langCode === "it"
        ? "gg/mm/aaaa — gg/mm/aaaa"
        : "dd/mm/yyyy — dd/mm/yyyy"

  const months = typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm",
              "hover:bg-muted focus:outline-none"
            )}
          >
            <span className={cn(!from && !to && "text-muted-foreground")}>{label}</span>
            <CalendarIcon className="h-4 w-4 opacity-70 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-2" align="start">
          <Calendar
            mode="range"
            numberOfMonths={months}
            selected={value}
            onSelect={(r) => {
              onChange?.(r)
              // chiudi quando il range è completo
              if (r?.from && r?.to) setOpen(false)
            }}
            disabled={{ before: new Date() }}
            locale={locale}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}


