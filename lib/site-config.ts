export const SITE_CONFIG = {
  name: "CHAPLIN Luxury Holiday House",
  shortName: "Chaplin",
  address: "Via della Pettinara 48, 01100 Viterbo (VT)",
  addressLine1: "Via della Pettinara 48",
  addressLine2: "01100 Viterbo (VT)",
  city: "Viterbo, Italia",
  phone: "+39 375 701 7689",
  publicEmail: "chaplinviterbo@gmail.com",
  defaultSiteUrl: "https://chaplinluxuryholidayhouse.it",
  emailLogoPath: "/images/chaplin-logo-white.png",
} as const

export function getPublicSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    SITE_CONFIG.defaultSiteUrl
  ).replace(/\/+$/, "")
}

export function getEmailLogoUrl() {
  return `${getPublicSiteUrl()}${SITE_CONFIG.emailLogoPath}`
}
