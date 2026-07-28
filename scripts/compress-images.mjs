import sharp from "sharp"
import { readdir, stat, rename, unlink } from "node:fs/promises"
import { join, extname } from "node:path"

// Max dimensions / quality. Full-screen hero is at most ~2560px wide on big displays.
const MAX_DIM = 2200
const QUALITY = 78
// Only touch files larger than this (bytes). Small files are already fine.
const SIZE_THRESHOLD = 1_200_000 // 1.2MB

const TARGET_DIRS = ["public"]

sharp.cache(false)
sharp.concurrency(1)

async function readdirRecursive(dir) {
  const out = []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await readdirRecursive(full)))
    } else {
      out.push(full)
    }
  }
  return out
}

async function processFile(filePath) {
  const ext = extname(filePath).toLowerCase()
  if (![".jpg", ".jpeg", ".png"].includes(ext)) return null

  const before = (await stat(filePath)).size
  if (before < SIZE_THRESHOLD) return null

  const tmp = filePath + ".tmp"
  const meta = await sharp(filePath).metadata()

  let pipeline = sharp(filePath).rotate() // respect EXIF orientation
  if ((meta.width || 0) > MAX_DIM || (meta.height || 0) > MAX_DIM) {
    pipeline = pipeline.resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  // Always re-encode as compressed JPEG (keeps .jpg/.JPG extension; PNGs of photos become jpg-quality but keep name)
  await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toFile(tmp)

  const after = (await stat(tmp)).size
  if (after >= before) {
    // No gain, discard
    await unlink(tmp)
    return null
  }

  await rename(tmp, filePath)
  return { filePath, before, after }
}

async function run() {
  let totalBefore = 0
  let totalAfter = 0
  let count = 0

  for (const dir of TARGET_DIRS) {
    const files = await readdirRecursive(dir)
    for (const fp of files) {
      try {
        const result = await processFile(fp)
        if (result) {
          totalBefore += result.before
          totalAfter += result.after
          count++
          console.log(
            `${result.filePath}: ${(result.before / 1e6).toFixed(1)}MB -> ${(result.after / 1e6).toFixed(2)}MB`,
          )
        }
      } catch (e) {
        console.error(`Failed ${fp}:`, e.message)
      }
    }
  }

  console.log(
    `\nDone. Compressed ${count} files. Total ${(totalBefore / 1e6).toFixed(1)}MB -> ${(totalAfter / 1e6).toFixed(1)}MB`,
  )
}

run()
