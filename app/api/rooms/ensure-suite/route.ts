import { NextResponse } from "next/server"

import { adminApiErrorResponse, requireAdminApi } from "@/lib/require-admin-api"
import { ensureSuiteRoom } from "@/lib/suite-room"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    await requireAdminApi(request)
    const suite = await ensureSuiteRoom()

    return NextResponse.json(
      {
        success: true,
        created: suite.created,
        roomId: suite.roomId,
        roomName: suite.roomName,
        price: suite.basePrice,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return adminApiErrorResponse(error)
  }
}
