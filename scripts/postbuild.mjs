import { cpSync, existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const standalone = resolve(root, ".next", "standalone")
if (!existsSync(standalone)) process.exit(0)

const publicSource = resolve(root, "public")
const publicTarget = resolve(standalone, "public")
const staticSource = resolve(root, ".next", "static")
const staticTarget = resolve(standalone, ".next", "static")

mkdirSync(resolve(standalone, ".next"), { recursive: true })
if (existsSync(publicSource)) cpSync(publicSource, publicTarget, { recursive: true, force: true })
if (existsSync(staticSource)) cpSync(staticSource, staticTarget, { recursive: true, force: true })
