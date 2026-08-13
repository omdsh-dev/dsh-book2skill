/**
 * Install engine: copy the generated SKILL.md + chapter references into
 * the chosen targets (~/.claude/skills, ~/.codex/skills, and the kk_skill
 * sync repo). Runs host-side with plain Node fs; each target reports its
 * own outcome so a partial failure is visible per target.
 * @module dsh-book2skill/install
 */
import type { Book2SkillJob, InstallResultItem, InstallTarget } from './types.ts';
export declare function targetDir(target: InstallTarget): string;
export interface InstallRequest {
    targets: InstallTarget[];
    /** Allow overwriting an existing skill directory of the same name. */
    overwrite?: boolean;
}
/** Copy the finished skill into every requested target. */
export declare function installSkill(job: Book2SkillJob, request: InstallRequest): InstallResultItem[];
