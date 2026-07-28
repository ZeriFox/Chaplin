"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Bed, UtensilsCrossed, Bath, Waves, Info, Users, Maximize } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

type Lang = "it" | "en" | "fr" | "es" | "de"

interface RoomContent {
  description: string
  badges: { adults: string; beds: string; bath: string; size: string }
  zones: { title: string; items: string[] }[]
}

const content: Record<Lang, RoomContent> = {
  it: {
    description:
      "Una magnifica struttura pensata per rilassarsi. Possiede un'elegante camera matrimoniale e offre un'esperienza di soggiorno indimenticabile con il suo design raffinato e i comfort moderni.",
    badges: { adults: "Max 2 adulti", beds: "2 letti", bath: "1 bagno", size: "57 m²" },
    zones: [
      {
        title: "Zona notte",
        items: [
          "Letto matrimoniale",
          "Armadio",
          "Cassettiera",
          "Poltrona",
          "TV",
          "Biancheria da letto",
          "WiFi",
          "Aria condizionata",
          "Riscaldamento",
          "Sistema ecoclima VMC",
        ],
      },
      {
        title: "Zona giorno",
        items: [
          "Cucina attrezzata",
          "Frigorifero",
          "Congelatore",
          "Lavastoviglie",
          "Forno a microonde",
          "Bollitore",
          "Macchina caffè",
          "Tavolo",
        ],
      },
      {
        title: "Bagno privato",
        items: [
          "Doccia",
          "WC",
          "Bidet",
          "Lavabo",
          "Phon",
          "Cassettiera",
          "Biancheria da bagno",
          "Kit cortesia per igiene personale",
        ],
      },
      {
        title: "Zona spa",
        items: [
          "Grotta del relax",
          "Mini piscina con funzione idromassaggio e cromoterapia",
          "Doccia sensoriale",
          "Angolo tisane",
          "Caminetto fronte vasca",
          "Musica Dolby relax",
        ],
      },
      {
        title: "Informazioni utili",
        items: [
          "Parcheggio comodo a pochi metri",
          "Vietato fumare",
          "Animali non ammessi",
          "Assistenza 24/24",
          "Self check-in",
          "Pulizie giornaliere",
          "Accesso area spa dalle ore 15 alle 03 di notte",
          "Estintore antincendio",
          "Cassetta di primo soccorso",
          "Tutto a norma di legge: dispositivo sensore CO/gas",
        ],
      },
    ],
  },
  en: {
    description:
      "A magnificent property designed for relaxation. It features an elegant double room and offers an unforgettable stay experience with its refined design and modern comforts.",
    badges: { adults: "Max 2 adults", beds: "2 beds", bath: "1 bathroom", size: "57 m²" },
    zones: [
      {
        title: "Sleeping area",
        items: [
          "Double bed",
          "Wardrobe",
          "Chest of drawers",
          "Armchair",
          "TV",
          "Bed linen",
          "WiFi",
          "Air conditioning",
          "Heating",
          "Ecoclima VMC system",
        ],
      },
      {
        title: "Living area",
        items: [
          "Equipped kitchen",
          "Refrigerator",
          "Freezer",
          "Dishwasher",
          "Microwave oven",
          "Kettle",
          "Coffee machine",
          "Table",
        ],
      },
      {
        title: "Private bathroom",
        items: [
          "Shower",
          "WC",
          "Bidet",
          "Sink",
          "Hairdryer",
          "Chest of drawers",
          "Bath linen",
          "Personal hygiene courtesy kit",
        ],
      },
      {
        title: "Spa area",
        items: [
          "Relaxation grotto",
          "Mini pool with hydromassage and chromotherapy",
          "Sensory shower",
          "Herbal tea corner",
          "Fireplace facing the tub",
          "Dolby relax music",
        ],
      },
      {
        title: "Useful information",
        items: [
          "Convenient parking a few meters away",
          "No smoking",
          "Pets not allowed",
          "24/7 assistance",
          "Self check-in",
          "Daily cleaning",
          "Spa access from 3:00 PM to 3:00 AM",
          "Fire extinguisher",
          "First aid kit",
          "Fully compliant: CO/gas sensor device",
        ],
      },
    ],
  },
  fr: {
    description:
      "Une magnifique structure pensée pour la détente. Elle dispose d'une élégante chambre double et offre une expérience de séjour inoubliable grâce à son design raffiné et son confort moderne.",
    badges: { adults: "Max 2 adultes", beds: "2 lits", bath: "1 salle de bain", size: "57 m²" },
    zones: [
      {
        title: "Coin nuit",
        items: [
          "Lit double",
          "Armoire",
          "Commode",
          "Fauteuil",
          "TV",
          "Linge de lit",
          "WiFi",
          "Climatisation",
          "Chauffage",
          "Système ecoclima VMC",
        ],
      },
      {
        title: "Coin jour",
        items: [
          "Cuisine équipée",
          "Réfrigérateur",
          "Congélateur",
          "Lave-vaisselle",
          "Four à micro-ondes",
          "Bouilloire",
          "Machine à café",
          "Table",
        ],
      },
      {
        title: "Salle de bain privée",
        items: [
          "Douche",
          "WC",
          "Bidet",
          "Lavabo",
          "Sèche-cheveux",
          "Commode",
          "Linge de toilette",
          "Kit de courtoisie pour l'hygiène personnelle",
        ],
      },
      {
        title: "Espace spa",
        items: [
          "Grotte de relaxation",
          "Mini piscine avec hydromassage et chromothérapie",
          "Douche sensorielle",
          "Coin tisanes",
          "Cheminée face à la baignoire",
          "Musique Dolby relax",
        ],
      },
      {
        title: "Informations utiles",
        items: [
          "Parking pratique à quelques mètres",
          "Interdiction de fumer",
          "Animaux non admis",
          "Assistance 24h/24",
          "Self check-in",
          "Ménage quotidien",
          "Accès à l'espace spa de 15h à 03h du matin",
          "Extincteur",
          "Trousse de premiers secours",
          "Tout conforme à la loi : détecteur CO/gaz",
        ],
      },
    ],
  },
  es: {
    description:
      "Una magnífica estructura pensada para relajarse. Dispone de una elegante habitación doble y ofrece una experiencia de estancia inolvidable con su diseño refinado y comodidades modernas.",
    badges: { adults: "Máx 2 adultos", beds: "2 camas", bath: "1 baño", size: "57 m²" },
    zones: [
      {
        title: "Zona de descanso",
        items: [
          "Cama de matrimonio",
          "Armario",
          "Cómoda",
          "Sillón",
          "TV",
          "Ropa de cama",
          "WiFi",
          "Aire acondicionado",
          "Calefacción",
          "Sistema ecoclima VMC",
        ],
      },
      {
        title: "Zona de día",
        items: [
          "Cocina equipada",
          "Frigorífico",
          "Congelador",
          "Lavavajillas",
          "Microondas",
          "Hervidor",
          "Cafetera",
          "Mesa",
        ],
      },
      {
        title: "Baño privado",
        items: [
          "Ducha",
          "WC",
          "Bidé",
          "Lavabo",
          "Secador",
          "Cómoda",
          "Ropa de baño",
          "Kit de cortesía para higiene personal",
        ],
      },
      {
        title: "Zona spa",
        items: [
          "Gruta del relax",
          "Mini piscina con hidromasaje y cromoterapia",
          "Ducha sensorial",
          "Rincón de infusiones",
          "Chimenea frente a la bañera",
          "Música Dolby relax",
        ],
      },
      {
        title: "Información útil",
        items: [
          "Aparcamiento cómodo a pocos metros",
          "Prohibido fumar",
          "No se admiten animales",
          "Asistencia 24/24",
          "Self check-in",
          "Limpieza diaria",
          "Acceso a la zona spa de 15:00 a 03:00 de la noche",
          "Extintor de incendios",
          "Botiquín de primeros auxilios",
          "Todo conforme a la ley: dispositivo sensor CO/gas",
        ],
      },
    ],
  },
  de: {
    description:
      "Eine wunderschöne Unterkunft zum Entspannen. Sie verfügt über ein elegantes Doppelzimmer und bietet mit ihrem raffinierten Design und modernem Komfort ein unvergessliches Aufenthaltserlebnis.",
    badges: { adults: "Max 2 Erwachsene", beds: "2 Betten", bath: "1 Bad", size: "57 m²" },
    zones: [
      {
        title: "Schlafbereich",
        items: [
          "Doppelbett",
          "Kleiderschrank",
          "Kommode",
          "Sessel",
          "TV",
          "Bettwäsche",
          "WLAN",
          "Klimaanlage",
          "Heizung",
          "Ecoclima VMC System",
        ],
      },
      {
        title: "Wohnbereich",
        items: [
          "Ausgestattete Küche",
          "Kühlschrank",
          "Gefrierschrank",
          "Geschirrspüler",
          "Mikrowelle",
          "Wasserkocher",
          "Kaffeemaschine",
          "Tisch",
        ],
      },
      {
        title: "Privates Bad",
        items: [
          "Dusche",
          "WC",
          "Bidet",
          "Waschbecken",
          "Haartrockner",
          "Kommode",
          "Badwäsche",
          "Kulanz-Set für die persönliche Hygiene",
        ],
      },
      {
        title: "Spa-Bereich",
        items: [
          "Entspannungsgrotte",
          "Minipool mit Hydromassage und Chromotherapie",
          "Sinnesdusche",
          "Kräutertee-Ecke",
          "Kamin vor der Wanne",
          "Dolby Relax Musik",
        ],
      },
      {
        title: "Nützliche Informationen",
        items: [
          "Bequemer Parkplatz wenige Meter entfernt",
          "Rauchen verboten",
          "Keine Haustiere erlaubt",
          "24/24 Unterstützung",
          "Self Check-in",
          "Tägliche Reinigung",
          "Zugang zum Spa-Bereich von 15:00 bis 03:00 Uhr nachts",
          "Feuerlöscher",
          "Erste-Hilfe-Kasten",
          "Alles gesetzeskonform: CO/Gas-Sensor",
        ],
      },
    ],
  },
}

const zoneIcons = [Bed, UtensilsCrossed, Bath, Waves, Info]

interface RoomDetailsProps {
  roomId: string
}

export function RoomDetails({ roomId }: RoomDetailsProps) {
  const { language } = useLanguage()
  const data = content[(language as Lang) || "it"] || content.it

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-3 text-balance">
          CHAPLIN Luxury Holiday House
        </h1>

        {/* Quick badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-muted text-foreground">
            <Users className="w-4 h-4 text-primary" />
            {data.badges.adults}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-muted text-foreground">
            <Bed className="w-4 h-4 text-primary" />
            {data.badges.beds}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-muted text-foreground">
            <Bath className="w-4 h-4 text-primary" />
            {data.badges.bath}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-muted text-foreground">
            <Maximize className="w-4 h-4 text-primary" />
            {data.badges.size}
          </span>
        </div>

        <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{data.description}</p>
      </div>

      {/* Single details card */}
      <Card>
        <CardContent className="p-6 space-y-8">
          {data.zones.map((zone, index) => {
            const Icon = zoneIcons[index] || Info
            return (
              <div key={index}>
                <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                  {zone.title}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {zone.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {index < data.zones.length - 1 && <div className="mt-8 border-b border-border" />}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
