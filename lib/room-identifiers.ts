export const SUITE_ROOM_ID = "2"
export const SUITE_PUBLIC_SLUG = "appartamento-chaplin"

const SUITE_ALIASES = new Set([SUITE_ROOM_ID, SUITE_PUBLIC_SLUG, "suite"])

export function normalizePublicRoomId(value?: string | null) {
  const roomId = String(value || "").trim()

  if (!roomId || SUITE_ALIASES.has(roomId.toLowerCase())) {
    return SUITE_ROOM_ID
  }

  return roomId
}
