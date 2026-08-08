import { NextResponse } from "next/server"

export async function PUT() {
  return NextResponse.json(
    { error: "Endpoint disabilitato: usa il cambio password autenticato dell'account" },
    { status: 410 },
  )
}
