/**
 * z-lib search/download adapter (best effort, no hardcoded secrets).
 *
 * Login state rides the user's existing book-downloader skill cookies
 * (~/.claude/skills/book-downloader/auth/zlib-cookies.json); when absent
 * the endpoints answer a structured `needAuth` result and the panel shows
 * the fallback guidance (local path, or run the book-downloader skill to
 * log in first). Transfers go through curl (headers + binary support),
 * converting the Playwright cookie JSON into a Netscape cookie jar on the
 * fly — nothing is embedded and nothing is written to the repo.
 * @module @dsh-external/dsh-book2skill/zlib
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { shellCommand } from './shell.ts'

export const ZLIB_BASE = 'https://zh.z-lib.sk'
export const ZLIB_COOKIE_FILE = join(homedir(), '.claude', 'skills', 'book-downloader', 'auth', 'zlib-cookies.json')
const JAR_DIR = join('/tmp', 'book2skill-work', 'zlib-jars')

export interface ZlibBookRow {
  title: string
  author: string
  year: string
  extension: string
  filesize: string
  download: string
  href: string
}

export interface ZlibSearchResult {
  ok: boolean
  needAuth?: boolean
  rows?: ZlibBookRow[]
  error?: string
  hint?: string
}

/** Convert Playwright cookie JSON → Netscape jar file; undefined when absent. */
function cookieJar(): string | undefined {
  try {
    if (!existsSync(ZLIB_COOKIE_FILE)) return undefined
    const cookies = JSON.parse(readFileSync(ZLIB_COOKIE_FILE, 'utf8')) as Array<{
      name: string; value: string; domain: string; path?: string; expires?: number; secure?: boolean
    }>
    if (!Array.isArray(cookies) || cookies.length === 0) return undefined
    mkdirSync(JAR_DIR, { recursive: true })
    const jar = join(JAR_DIR, 'zlib.txt')
    const lines = ['# Netscape HTTP Cookie File']
    for (const cookie of cookies) {
      if (!cookie.domain.includes('z-lib')) continue
      const domain = cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`
      const secure = cookie.secure === true ? 'TRUE' : 'FALSE'
      const expires = cookie.expires === -1 ? 0 : Math.floor((cookie.expires ?? 0) / 1000)
      lines.push(`${domain}\tTRUE\t${cookie.path ?? '/'}\t${secure}\t${expires}\t${cookie.name}\t${cookie.value}`)
    }
    writeFileSync(jar, lines.join('\n'), 'utf8')
    return jar
  } catch {
    return undefined
  }
}

async function curl(
  ctx: Context,
  args: string[],
  signal?: AbortSignal,
  timeoutMs = 90_000,
): Promise<{ code: number | null; stdout: string }> {
  const spec = ctx.shell.resolve({
    command: shellCommand('curl', ['-sS', '-L', '--max-time', String(Math.floor(timeoutMs / 1000)), ...args]),
    workdir: '/tmp',
    timeoutMs,
    stdoutMaxBytes: 4 * 1024 * 1024,
    signal,
  })
  const result = await ctx.shell.run(spec)
  return { code: result.exitCode, stdout: result.stdout.text }
}

/** Search z-lib. Returns `needAuth` when no cookie file exists. */
export async function searchZlib(ctx: Context, query: string, signal?: AbortSignal): Promise<ZlibSearchResult> {
  if (signal?.aborted) return { ok: false, error: '已取消' }
  const jar = cookieJar()
  if (jar === undefined) {
    return {
      ok: false,
      needAuth: true,
      hint: '未找到 z-lib 登录态（~/.claude/skills/book-downloader/auth/zlib-cookies.json）。请先用 book-downloader skill 登录一次，或直接提供本地书籍路径。',
    }
  }
  const result = await curl(ctx, ['-b', jar, '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36', `${ZLIB_BASE}/s/${encodeURIComponent(query)}`], signal)
  if (result.code !== 0 || result.stdout.length === 0) {
    return { ok: false, error: `z-lib 请求失败（curl exit ${result.code ?? '?'}）`, hint: '可能是网络或风控限制，建议改用本地路径。' }
  }
  const rows = extractBookCards(result.stdout)
  if (rows.length === 0) {
    return { ok: true, rows: [], hint: '未解析到书籍卡片（页面结构可能已变化或登录态失效）。建议换关键词，或改用本地路径。' }
  }
  return { ok: true, rows: rows.slice(0, 20) }
}

/** Download one book by its /dl/<token> path into `destFile`. */
export async function downloadZlib(
  ctx: Context, downloadPath: string, destFile: string, signal?: AbortSignal,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (signal?.aborted) return { ok: false, error: '已取消' }
  const jar = cookieJar()
  if (jar === undefined) {
    return { ok: false, error: '未找到 z-lib 登录态，无法下载。请先用 book-downloader skill 登录，或改用本地路径。' }
  }
  const result = await curl(ctx, [
    '-b', jar,
    '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
    '-e', `${ZLIB_BASE}/`,
    '-o', destFile,
    '--write-out', '%{http_code} %{size_download}',
    `${ZLIB_BASE}${downloadPath}`,
  ], signal, 300_000)
  if (result.code !== 0) {
    return { ok: false, error: `下载失败（curl exit ${result.code ?? '?'}），可能是每日限额已用尽或网络问题` }
  }
  const sizeMatch = /(\d+)\s+(\d+)$/.exec(result.stdout.trim())
  const bytes = sizeMatch === null ? 0 : Number(sizeMatch[2])
  if (!existsSync(destFile) || bytes < 10_000) {
    return { ok: false, error: '下载内容过小或未落盘（可能被风控拦截）。可换格式（EPUB 优先）或改用本地路径。' }
  }
  return { ok: true, path: destFile }
}

/** Parse z-bookcard elements from the search page (defensive). */
function extractBookCards(html: string): ZlibBookRow[] {
  const rows: ZlibBookRow[] = []
  const attr = (tag: string, name: string): string => {
    const match = new RegExp(`${name}="([^"]*)"`).exec(tag)
    return match?.[1] ?? ''
  }
  const stripTags = (text: string): string => text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const cardRe = /<z-bookcard\b[^>]*>/g
  const cards: string[] = []
  let match: RegExpExecArray | null
  while ((match = cardRe.exec(html)) !== null) cards.push(match[0])
  for (const tag of cards) {
    const title = attr(tag, 'title') || '未知书名'
    const author = attr(tag, 'author')
    const download = attr(tag, 'download')
    if (title === '未知书名' && download === '') continue
    rows.push({
      title: stripTags(title).slice(0, 120),
      author: stripTags(author).slice(0, 80),
      year: attr(tag, 'year'),
      extension: attr(tag, 'extension'),
      filesize: attr(tag, 'filesize'),
      download,
      href: attr(tag, 'href'),
    })
  }
  return rows
}
