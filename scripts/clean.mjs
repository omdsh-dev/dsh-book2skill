import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const lib = fileURLToPath(new URL('../lib', import.meta.url))
rmSync(lib, { recursive: true, force: true })
