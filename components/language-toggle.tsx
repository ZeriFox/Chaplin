"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const languages = [
  { code: "it" as const, name: "Italiano", flag: "🇮🇹" },
  { code: "en" as const, name: "English", flag: "🇬🇧" },
  { code: "fr" as const, name: "Français", flag: "🇫🇷" },
  { code: "es" as const, name: "Español", flag: "🇪🇸" },
  { code: "de" as const, name: "Deutsch", flag: "🇩🇪" },
]

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const currentLanguage = languages.find((lang) => lang.code === language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-foreground hover:text-primary transition-all duration-300 hover:scale-105"
        >
          <Globe className="h-4 w-4" />
          <span className="font-medium">
            {currentLanguage?.flag} {currentLanguage?.code.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              language === lang.code ? "bg-primary/10 font-semibold" : ""
            }`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

