import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, getDocs } from "firebase/firestore"

export async function POST() {
  try {
    const defaultSeasons = [
      // STAGIONE BASSA - Novembre, Dicembre (no festività), Gennaio, Febbraio
      {
        id: "bassa-nov",
        name: "Stagione Bassa Novembre",
        type: "bassa" as const,
        startDate: "11-01", // Solo mese-giorno!
        endDate: "11-30",
        priceMultiplier: 0.7, // -30%
        description: "Novembre - Domanda molto bassa",
      },
      {
        id: "bassa-gen-feb",
        name: "Stagione Bassa Inverno",
        type: "bassa" as const,
        startDate: "01-07", // Dopo Epifania
        endDate: "02-28",
        priceMultiplier: 0.7,
        description: "Gennaio-Febbraio - Bassa stagione invernale",
      },
      {
        id: "bassa-dic-inizio",
        name: "Stagione Bassa Dicembre Inizio",
        type: "bassa" as const,
        startDate: "12-01",
        endDate: "12-05",
        priceMultiplier: 0.7,
        description: "Inizio Dicembre",
      },
      {
        id: "bassa-dic-mid",
        name: "Stagione Bassa Dicembre Metà",
        type: "bassa" as const,
        startDate: "12-10",
        endDate: "12-20",
        priceMultiplier: 0.7,
        description: "Metà Dicembre",
      },
      {
        id: "bassa-ott",
        name: "Stagione Bassa Ottobre",
        type: "bassa" as const,
        startDate: "10-16",
        endDate: "10-31",
        priceMultiplier: 0.7,
        description: "Fine Ottobre",
      },

      // STAGIONE MEDIA - Marzo, Aprile (no Pasqua), Ottobre
      {
        id: "media-mar",
        name: "Stagione Media Primavera",
        type: "media" as const,
        startDate: "03-01",
        endDate: "03-31",
        priceMultiplier: 1.0,
        description: "Marzo - Clima buono, turisti moderati",
      },
      {
        id: "media-apr",
        name: "Stagione Media Aprile",
        type: "media" as const,
        startDate: "04-01",
        endDate: "04-10",
        priceMultiplier: 1.0,
        description: "Aprile - Prima della Pasqua",
      },
      {
        id: "media-ott",
        name: "Stagione Media Autunno",
        type: "media" as const,
        startDate: "10-01",
        endDate: "10-15",
        priceMultiplier: 1.0,
        description: "Ottobre - Turisti moderati",
      },
      {
        id: "media-sett-fine",
        name: "Stagione Media Fine Settembre",
        type: "media" as const,
        startDate: "09-20",
        endDate: "09-30",
        priceMultiplier: 1.0,
        description: "Fine Settembre",
      },

      // STAGIONE MEDIO-ALTA - Maggio, Settembre
      {
        id: "medio-alta-mag",
        name: "Stagione Medio-Alta Maggio",
        type: "medio-alta" as const,
        startDate: "05-01",
        endDate: "05-31",
        priceMultiplier: 1.3, // +30%
        description: "Maggio - Matrimoni, weekend pieni",
      },
      {
        id: "medio-alta-sett",
        name: "Stagione Medio-Alta Settembre",
        type: "medio-alta" as const,
        startDate: "09-01",
        endDate: "09-19",
        priceMultiplier: 1.3,
        description: "Settembre - Mare ancora attraente",
      },

      // STAGIONE ALTA - Giugno, Luglio
      {
        id: "alta-giu",
        name: "Stagione Alta Giugno",
        type: "alta" as const,
        startDate: "06-01",
        endDate: "06-30",
        priceMultiplier: 1.6, // +60%
        description: "Giugno - Turisti italiani + stranieri",
      },
      {
        id: "alta-lug",
        name: "Stagione Alta Luglio",
        type: "alta" as const,
        startDate: "07-01",
        endDate: "07-31",
        priceMultiplier: 1.7, // +70%
        description: "Luglio - Eventi estivi",
      },

      // STAGIONE SUPER-ALTA - Agosto
      {
        id: "super-alta-ago-inizio",
        name: "Stagione Super-Alta Agosto Inizio",
        type: "super-alta" as const,
        startDate: "08-01",
        endDate: "08-09",
        priceMultiplier: 2.2, // +120%
        description: "Inizio Agosto",
      },
      {
        id: "super-alta-ago-fine",
        name: "Stagione Super-Alta Agosto Fine",
        type: "super-alta" as const,
        startDate: "08-21",
        endDate: "08-31",
        priceMultiplier: 2.2,
        description: "Fine Agosto",
      },
    ]

    const defaultSpecialPeriods = [
      // Natale e Capodanno 2025-2026
      {
        id: "natale-2025",
        name: "Natale 2025",
        startDate: "2025-12-23",
        endDate: "2025-12-26",
        priceMultiplier: 1.4,
        description: "Festività Natalizie",
        priority: 1,
      },
      {
        id: "capodanno-2025-2026",
        name: "Capodanno 2025-2026",
        startDate: "2025-12-27",
        endDate: "2026-01-02",
        priceMultiplier: 1.8,
        description: "Capodanno e inizio anno",
        priority: 1,
      },
      {
        id: "immacolata-2025",
        name: "Immacolata 2025",
        startDate: "2025-12-06",
        endDate: "2025-12-09",
        priceMultiplier: 1.4,
        description: "Ponte dell'Immacolata",
        priority: 1,
      },
      {
        id: "epifania-2026",
        name: "Epifania 2026",
        startDate: "2026-01-01",
        endDate: "2026-01-06",
        priceMultiplier: 1.4,
        description: "Festività Epifania",
        priority: 1,
      },
      // Pasqua 2026
      {
        id: "pasqua-2026",
        name: "Pasqua 2026",
        startDate: "2026-04-03",
        endDate: "2026-04-06",
        priceMultiplier: 1.3,
        description: "Festività Pasquali",
        priority: 1,
      },
      // Ponti primaverili 2026
      {
        id: "25-aprile-2026",
        name: "25 Aprile 2026",
        startDate: "2026-04-24",
        endDate: "2026-04-26",
        priceMultiplier: 1.3,
        description: "Ponte 25 Aprile",
        priority: 1,
      },
      {
        id: "1-maggio-2026",
        name: "1° Maggio 2026",
        startDate: "2026-05-01",
        endDate: "2026-05-03",
        priceMultiplier: 1.3,
        description: "Ponte 1° Maggio",
        priority: 1,
      },
      {
        id: "2-giugno-2026",
        name: "2 Giugno 2026",
        startDate: "2026-06-01",
        endDate: "2026-06-03",
        priceMultiplier: 1.4,
        description: "Ponte 2 Giugno",
        priority: 1,
      },
      // Ferragosto 2026
      {
        id: "ferragosto-2026",
        name: "Ferragosto 2026",
        startDate: "2026-08-10",
        endDate: "2026-08-20",
        priceMultiplier: 2.5, // +150%
        description: "Ferragosto - Domanda massima assoluta",
        priority: 2,
      },
      // Eventi 2026 (da aggiornare ogni anno)
      {
        id: "red-bull-2026",
        name: "Red Bull Cliff Diving 2026",
        startDate: "2026-07-24",
        endDate: "2026-07-26",
        priceMultiplier: 1.8,
        description: "Evento internazionale Red Bull",
        priority: 2,
      },
      {
        id: "festival-modugno-2026",
        name: "Festival Meraviglioso Modugno 2026",
        startDate: "2026-07-17",
        endDate: "2026-07-19",
        priceMultiplier: 1.4,
        description: "Festival musicale a Polignano",
        priority: 1,
      },
    ]

    // Save seasons
    const seasonsCollection = collection(db, "pricing_seasons")
    for (const season of defaultSeasons) {
      await setDoc(doc(seasonsCollection, season.id), season)
    }

    // Save special periods
    const periodsCollection = collection(db, "pricing_special_periods")
    for (const period of defaultSpecialPeriods) {
      await setDoc(doc(periodsCollection, period.id), period)
    }

    return NextResponse.json({
      success: true,
      message: `Inizializzazione completata: ${defaultSeasons.length} stagioni ricorrenti e ${defaultSpecialPeriods.length} periodi speciali creati`,
      seasons: defaultSeasons.length,
      specialPeriods: defaultSpecialPeriods.length,
    })
  } catch (error) {
    console.error("Error initializing pricing defaults:", error)
    return NextResponse.json({ error: "Failed to initialize defaults" }, { status: 500 })
  }
}

// GET to check if already initialized
export async function GET() {
  try {
    const seasonsSnapshot = await getDocs(collection(db, "pricing_seasons"))
    const periodsSnapshot = await getDocs(collection(db, "pricing_special_periods"))

    return NextResponse.json({
      initialized: seasonsSnapshot.size > 0 || periodsSnapshot.size > 0,
      seasons: seasonsSnapshot.size,
      specialPeriods: periodsSnapshot.size,
    })
  } catch (error) {
    console.error("Error checking initialization:", error)
    return NextResponse.json({ error: "Failed to check initialization" }, { status: 500 })
  }
}

