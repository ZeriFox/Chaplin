export const safe = {
text: (v: any, fallback = "Non ancora presente") => (typeof v === "string" && v.trim() ? v : fallback),
num: (v: any, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback),
arr: <T>(v: T[] | undefined | null, fallback: T[] = []) => (Array.isArray(v) ? v : fallback),
}