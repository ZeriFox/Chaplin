"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { it as itLocale } from "date-fns/locale"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** locale date-fns opzionale (it, enGB, fr, es, de, …) */
  locale?: Locale
}

/** Wrapper shadcn per react-day-picker, con range “scia” e senza outsideDays selezionabili */
export function Calendar({ className, classNames, locale = itLocale, ...props }: CalendarProps) {
  return (
    <DayPicker
      // niente duplicati fuori mese (risolve i 29-30-31 doppi)
      showOutsideDays={false}
      locale={locale}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-2",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1 absolute left-2",
        nav_button: "h-7 w-7 rounded-md hover:bg-muted",
        nav_button_previous: "",
        nav_button_next: "ml-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground w-9 font-normal text-[0.8rem]",
        row: "flex mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: "h-9 w-9 rounded-md hover:bg-muted focus:outline-none",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
        day_today: "border border-primary",
        day_outside: "text-muted-foreground/50 pointer-events-none", // non cliccabili
        day_disabled: "text-muted-foreground/50",
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        // <— “scia” del range tra start e end
        range_middle: "bg-primary/10",
        ...classNames,
      }}
      {...props}
    />
  )
}



