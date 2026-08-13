import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const root = process.cwd()
const workspaceRoot = process.env.DSH_WORKSPACE_ROOT === undefined
  ? resolve(root, '../dsh-workspace')
  : resolve(process.env.DSH_WORKSPACE_ROOT)
const links = {
  '@deepseek-ai/cordis': 'vendor/cordis',
  '@deepseek-ai/dsh-storage-domain': 'packages/storage/storage-domain',
  '@deepseek-ai/dsh-tools': 'packages/core/tools',
  '@deepseek-ai/dsh-shell': 'packages/shell/shell',
  '@deepseek-ai/dsh-web': 'packages/web/web',
  '@deepseek-ai/dsh-host-webserver': 'packages/host/webserver',
  '@deepseek-ai/dsh-host-directory-picker': 'packages/host/directory-picker',
  '@deepseek-ai/dsh-client-runtime': 'packages/client/runtime',
  '@deepseek-ai/dsh-client-ui-slots': 'packages/client/ui-slots',
  '@deepseek-ai/dsh-client-ui-conversation': 'packages/client/ui-conversation',
}

if (!existsSync(workspaceRoot)) {
  throw new Error(`DSH workspace does not exist: ${workspaceRoot}. Set DSH_WORKSPACE_ROOT to a local DSH workspace.`)
}

for (const [packageName, workspacePath] of Object.entries(links)) {
  const target = resolve(workspaceRoot, workspacePath)
  const destination = resolve(root, 'node_modules', packageName)
  if (!existsSync(target)) {
    console.warn(`skip ${packageName}: ${target} does not exist`)
    continue
  }
  ensureLink(destination, target)
}

function ensureLink(destination, target) {
  mkdirSync(dirname(destination), { recursive: true })
  if (pathExists(destination)) {
    if (lstatSync(destination).isSymbolicLink()) {
      const current = resolve(dirname(destination), readlinkSync(destination))
      if (current === target) return
    }
    throw new Error(`Refusing to replace existing dependency: ${destination}`)
  }
  const linkTarget = process.platform === 'win32' ? target : relative(dirname(destination), target)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      symlinkSync(linkTarget, destination, process.platform === 'win32' ? 'junction' : 'dir')
      return
    } catch (error) {
      if (attempt === 1 || pathExists(destination)) throw error
    }
  }
}

function pathExists(path) {
  try {
    lstatSync(path)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return false
    throw error
  }
}
