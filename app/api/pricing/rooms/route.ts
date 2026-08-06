import { NextResponse } from "next/server"

import { ensureSuiteRoom } from "@/lib/suite-room"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const suite = await ensureSuiteRoom()

    return NextResponse.json(
      [
        {
          roomId: suite.roomId,
          roomName: suite.roomName,
          basePrice: suite.basePrice,
        },
      ],
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("Error ensuring Suite room:", error)
    return NextResponse.json(
      { error: "Failed to ensure Suite room" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
