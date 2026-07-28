export const ROOMS = [
  {
    id: "1",
    name: "Camera Familiare con Balcone",
    description: "Camera matrimoniale e balcone privato",
    images: [
      "/images/room-1.jpg", // room-1.jpg - main bedroom with stone arch
      "/public/images/room-3.jpg", // room-3.jpg - spacious room with dining area
      "/camera/camera14.jpg", // camera14.jpg - living area with sofa
      "/camera/camera15.jpg", // camera15.jpg - modern bathroom
      "/camera/camera13.jpg", // camera13.jpg - rooftop pool terrace
      "/polignano-room-family-balcony.jpg",
      "/polignano-sea-view-balcony.jpg",
      "/polignano-old-town-view.jpg",
      "/polignano-rooftop-pool.jpg",
      "/polignano-sunset-terrace.jpg",
      "/polignano-beach-cliffs.jpg",
      "/polignano-historic-center.jpg",
      "/polignano-adriatic-coast.jpg",
    ],
    price: 180,
    originalPrice: 220,
    guests: 2,
    beds: 2,
    bathrooms: 2,
    size: 35,
    amenities: [
      "Vista luogo di interesse",
      "vista mare",
      "Balcone privato",
      "WiFi gratuito",
      "Minibar",
      "Aria condizionata",
      "TV satellitare",
    ],
    rating: 4.9,
    reviews: 56,
    featured: true,
  },
  {
    id: "2",
    name: "Camera Matrimoniale con Vasca Idromassaggio",
    description: "Elegante camera con vasca idromassaggio e arredi di lusso",
    images: [
      "/public/images/room-2.jpg", // room-2.jpg - bedroom with beige stone arch
      "/public/images/spa.jpg", // spa.jpg - blue-lit jacuzzi (main feature!)
      "/public/images/camera18.jpg", // camera18.jpg - sauna
      "/public/images/spa1.jpg", // spa1.jpg - spa treatment area
      "/public/images/camera16.jpg", // camera16.jpg - modern bathroom
      "/public/images/polignano-room-jacuzzi-suite.jpg",
      "/polignano-spa-wellness.jpg",
      "/polignano-luxury-bathroom.jpg",
      "/polignano-romantic-suite.jpg",
      "/polignano-wellness-center.jpg",
      "/polignano-private-jacuzzi.jpg",
      "/polignano-suite-interior.jpg",
      "/polignano-relaxation-area.jpg",
    ],
    price: 150,
    originalPrice: 180,
    guests: 2,
    beds: 2,
    bathrooms: 1,
    size: 33,
    amenities: [
      "Aria condizionata",
      "TV satellitare",
      "Vasca idromassaggio",
      "Asciugacapelli",
      "WiFi gratuito",
      "Minibar",
    ],
    rating: 4.9,
    reviews: 56,
    featured: false,
  },
] as const

export type Room = (typeof ROOMS)[number]

