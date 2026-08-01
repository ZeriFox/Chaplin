"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import { Menu, X, LogOut, Home, Bed, Calendar, Phone, Crown, Sparkles, Star, Globe } from "lucide-react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t, language, setLanguage } = useLanguage()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  const languages = [
    { code: "it" as const, name: "Italiano", flag: "🇮🇹" },
    { code: "en" as const, name: "English", flag: "🇬🇧" },
    { code: "fr" as const, name: "Français", flag: "🇫🇷" },
    { code: "es" as const, name: "Español", flag: "🇪🇸" },
    { code: "de" as const, name: "Deutsch", flag: "🇩🇪" },
  ]

  const currentLanguage = languages.find((lang) => lang.code === language)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
  <div className="container mx-auto px-3 sm:px-4">
    <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
      <Link href="/" className="flex items-center gap-2 group shrink-0">
  <div className="relative h-10 w-28 sm:h-12 sm:w-36 md:h-14 md:w-44">
    <Image
      src="/images/chaplin-logo-readable.png"
      alt="Chaplin Luxury Holiday House"
      fill
      className="object-contain"
      priority
      sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 176px"
    />
  </div>
</Link>

            <div className="flex items-center gap-2 md:gap-4">
              <div className="md:hidden flex items-center">
                <span className="text-2xl">{currentLanguage?.flag}</span>
              </div>

              {/* Desktop Navigation - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-4">
                {/* Admin Section */}
                {user?.role === "admin" && (
                  <div className="flex items-center gap-2">
                    <Link href="/admin">
                      <Button variant="ghost" size="sm" className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>{t("admin")}</span>
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>{t("logout")}</span>
                    </Button>
                  </div>
                )}

                {/* Book Now Button */}
                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Link href="/prenota">{t("bookNow")}</Link>
                </Button>
              </div>

              {/* Menu Toggle - Always visible */}
              <Button
                variant="ghost"
                size="sm"
                className="relative group hover:bg-primary/10 transition-all duration-300 flex-shrink-0"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <Menu
                    className={`h-5 w-5 transition-all duration-300 ${isMenuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
                  />
                  <X
                    className={`h-5 w-5 absolute transition-all duration-300 ${isMenuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
                  />
                </div>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setIsMenuOpen(false)}>
          <div
            className="fixed top-0 right-0 h-full w-80 bg-[#1a1a1a]/95 backdrop-blur-sm shadow-2xl overflow-y-auto border-l border-[#c9a84c]/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 pt-20">
              <nav className="flex flex-col space-y-6">
                {/* Navigation Links */}
                <Link
                  href="/"
                  className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-lg font-bold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-[#c9a84c] rounded-full flex items-center justify-center">
                    <Home className="w-4 h-4 text-[#1a1a1a]" />
                  </div>
                  <span className="font-cinzel">{t("home")}</span>
                </Link>

                <Link
                  href="/camere"
                  className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-lg font-bold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-[#c9a84c] rounded-full flex items-center justify-center">
                    <Bed className="w-4 h-4 text-[#1a1a1a]" />
                  </div>
                  <span className="font-cinzel">{t("exclusiveSuite")}</span>
                </Link>

                <Link
                  href="/servizi"
                  className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-lg font-bold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-[#c9a84c] rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-[#1a1a1a]" />
                  </div>
                  <span className="font-cinzel">{t("services")}</span>
                </Link>

                <Link
                  href="/prenota"
                  className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-lg font-bold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-[#c9a84c] rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-[#1a1a1a]" />
                  </div>
                  <span className="font-cinzel">{t("booking")}</span>
                </Link>

                <Link
                  href="/contatti"
                  className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-lg font-bold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 bg-[#c9a84c] rounded-full flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#1a1a1a]" />
                  </div>
                  <span className="font-cinzel">{t("contacts")}</span>
                </Link>

                {/* Language Selector Section */}
                <div className="border-t border-white/20 pt-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-cinzel text-white uppercase tracking-wider font-bold">
                      {t("selectLanguage")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code)
                          // Don't close menu so user can see the language change
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                          language === lang.code
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-[#1a1a1a] font-bold shadow-lg"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-xs font-cinzel">{lang.code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Section */}
                {user?.role === "admin" && (
                  <div className="border-t border-white/20 pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                      <span className="text-xs font-cinzel text-white uppercase tracking-wider font-bold">{t("admin")}</span>
                    </div>
                    <>
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-sm font-medium mb-3"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-6 h-6 bg-[#c9a84c] rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-[#1a1a1a]" />
                        </div>
                        <span className="font-cinzel">{t("admin")}</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-white hover:text-[#c9a84c] transition-colors text-sm font-medium"
                      >
                        <div className="w-6 h-6 bg-[#c9a84c] rounded-full flex items-center justify-center">
                          <LogOut className="w-3 h-3 text-[#1a1a1a]" />
                        </div>
                        <span className="font-cinzel">{t("logout")}</span>
                      </button>
                    </>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}



