import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { shellCommand, shellQuote } from '../src/shell.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8')

test('rc.2 host contract uses shell everywhere and publishes compatible peers', () => {
  const manifest = JSON.parse(read('package.json')) as {
    dsh: { bundle: { patch: string }; client: { inject: string[] } }
    peerDependencies: Record<string, string>
  }
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-shell'], '>=0.0.1-rc.2 <0.0.2')
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-bash'], undefined)
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))

  const source = [
    'src/context.d.ts', 'src/index.ts', 'src/parse.ts', 'src/zlib.ts',
    'scripts/setup-dsh-workspace.mjs',
  ].map(read).join('\n')
  assert.doesNotMatch(source, /@deepseek-ai\/dsh-bash|ctx\.bash/)
  assert.doesNotMatch([read('src/index.ts'), read('src/ocr.ts'), read('src/routes.ts')].join('\n'), /httpServer/)
  assert.match(read('src/index.ts'), /['"]shell['"]/)
  assert.match(read('src/index.ts'), /['"]webServer['"]/)
  assert.match(read('scripts/setup-dsh-workspace.mjs'), /packages\/shell\/shell/)
})

test('Profile Bundle owns exactly one book2skill loader row', () => {
  const patch = read('cordis.patch.yml')
  assert.equal((patch.match(/- id: book2skill\b/g) ?? []).length, 1)
  assert.equal((patch.match(/name: dsh-book2skill\b/g) ?? []).length, 1)
  assert.match(read('README.md'), /dsh plugin --profile/)
  assert.doesNotMatch(read('README.md'), /cordis\.patch\.yml\s*追加|dsh\.profile\.bundles/)
})

test('shell argv quoting keeps spaces and metacharacters literal', () => {
  assert.equal(shellQuote('plain'), "'plain'")
  assert.equal(shellQuote("a'b"), "'a'\\''b'")
  assert.equal(
    shellCommand('python3', ['/tmp/a book.py', '$(touch /tmp/not-run)', "O'Reilly"]),
    "'python3' '/tmp/a book.py' '$(touch /tmp/not-run)' 'O'\\''Reilly'",
  )
})
