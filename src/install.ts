/**
 * Install engine: copy the generated SKILL.md + chapter references into
 * the chosen targets (~/.claude/skills, ~/.codex/skills, and the kk_skill
 * sync repo). Runs host-side with plain Node fs; each target reports its
 * own outcome so a partial failure is visible per target.
 * @module @dsh-external/dsh-book2skill/install
 */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Book2SkillJob, InstallResultItem, InstallTarget } from './types.ts'
import { chaptersDir, sanitizeBookKey } from './jobs.ts'

export function targetDir(target: InstallTarget): string {
  switch (target) {
    case 'claude': return join(homedir(), '.claude', 'skills')
    case 'codex': return join(homedir(), '.codex', 'skills')
    case 'kk_skill': return join(homedir(), 'kk_skill', 'skills')
  }
}

export interface InstallRequest {
  targets: InstallTarget[]
  /** Allow overwriting an existing skill directory of the same name. */
  overwrite?: boolean
}

/** Copy the finished skill into every requested target. */
export function installSkill(job: Book2SkillJob, request: InstallRequest): InstallResultItem[] {
  const name = job.skill.name ?? job.book.title ?? job.id
  const safeName = name.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'book-skill'
  const draft = job.skill.draft
  if (draft === undefined || draft.trim() === '') {
    throw new Error('SKILL.md 草稿为空：请先生成草稿并通过自检（门控2）再安装')
  }
  const bookKey = sanitizeBookKey(job.book.title ?? job.id)
  const sourceChapters = chaptersDir(job.id, bookKey)

  const results: InstallResultItem[] = []
  for (const target of request.targets) {
    const base = targetDir(target)
    const skillDir = join(base, safeName)
    try {
      if (existsSync(skillDir) && !request.overwrite) {
        throw new Error(`目标已存在同名 skill（${skillDir}）；如需覆盖请确认 overwrite`)
      }
      rmSync(skillDir, { recursive: true, force: true })
      mkdirSync(join(skillDir, 'references', bookKey), { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), draft, 'utf8')
      if (existsSync(sourceChapters)) {
        cpSync(sourceChapters, join(skillDir, 'references', bookKey), { recursive: true })
      }
      results.push({ target, path: skillDir, ok: true })
    } catch (error) {
      results.push({ target, path: skillDir, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return results
}
