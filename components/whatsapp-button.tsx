"use client"

import { MessageCircle } from "lucide-react"
import { useLanguage } from "./language-provider"
import { useState } from "react"

export function WhatsAppButton() {
  const { t } = useLanguage()
  const [isHovered, setIsHovered] = useState(false)

  const whatsappNumber = "+39 351 719 6320"
  const message = encodeURIComponent(t("whatsappMessage", "Ciao! Vorrei informazioni per CHAPLIN Luxury Holiday House"))

  const handleClick = () => {
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank")
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-24 right-6 z-40 flex items-center gap-3 rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:shadow-xl md:bottom-8 md:right-8 group"
      aria-label="Contattaci su WhatsApp"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <MessageCircle className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0" />
        <span
          className={`whitespace-nowrap font-medium text-sm overflow-hidden transition-all duration-300 ${
            isHovered ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          Chatta con noi
        </span>
      </div>
    </button>
  )
}
