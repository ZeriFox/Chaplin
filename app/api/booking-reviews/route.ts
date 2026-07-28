// app/api/booking-reviews/route.ts
import { NextResponse } from "next/server";

/** Fallback sicuro (4 recensioni “belle” come in screenshot) */
const DEFAULT_REVIEWS = [
  {
    name: "Marco Rossi",
    location: "Milano",
    rating: 5,
    comment: "Esperienza fantastica! Il servizio è impeccabile e la vista mozzafiato. Torneremo sicuramente!",
    date: "Dicembre 2024",
    verified: true,
    source: "default",
    createdAt: 1735600000000,
  },
  {
    name: "Sarah Johnson",
    location: "London, UK",
    rating: 5,
    comment: "Perfect location in Rome! The staff was incredibly helpful and the rooms are beautiful. Highly recommended!",
    date: "Novembre 2024",
    verified: true,
    source: "default",
    createdAt: 1733000000000,
  },
  {
    name: "Giuseppe Bianchi",
    location: "Roma",
    rating: 4,
    comment: "Ottima struttura nel cuore di Roma. Colazione eccellente e personale molto cortese.",
    date: "Ottobre 2024",
    verified: true,
    source: "default",
    createdAt: 1729900000000,
  },
  {
    name: "Marie Dubois",
    location: "Paris, France",
    rating: 5,
    comment:
      "Un séjour merveilleux! L'emplacement est parfait pour visiter Rome et le service est exceptionnel.",
    date: "Settembre 2024",
    verified: true,
    source: "default",
    createdAt: 1727300000000,
  },
];

export async function GET() {
  const url = process.env.BOOKING_API_URL;
  const key = process.env.BOOKING_API_KEY;

  // Se non configurato -> fallback
  if (!url || !key) {
    return NextResponse.json({
      items: DEFAULT_REVIEWS,
      note: "BOOKING_API_URL/KEY non configurati – uso fallback.",
    });
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    // se errore HTTP -> fallback
    if (!res.ok) {
      return NextResponse.json({
        items: DEFAULT_REVIEWS,
        note: `Booking API non disponibile (${res.status}) – uso fallback.`,
      });
    }

    const data = await res.json();
    const items = (Array.isArray(data) ? data : data.items || []).map((x: any) => ({
      name: x.name ?? x.author ?? "Guest",
      location: x.location ?? x.country ?? "",
      rating: Number(x.rating ?? x.score ?? 5),
      comment: x.comment ?? x.text ?? "",
      date: x.date ?? x.createdAt ?? "",
      verified: true,
      source: "booking",
      createdAt: Date.now(),
    }));

    // se vuoto -> fallback
    if (!items.length) {
      return NextResponse.json({
        items: DEFAULT_REVIEWS,
        note: "Nessuna recensione dalla Booking API – uso fallback.",
      });
    }

    return NextResponse.json({ items });
  } catch {
    // errore runtime -> fallback
    return NextResponse.json({
      items: DEFAULT_REVIEWS,
      note: "Errore runtime Booking API – uso fallback.",
    });
  }
}
