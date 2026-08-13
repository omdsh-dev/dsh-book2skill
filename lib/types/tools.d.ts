/**
 * Agent-facing tools: deterministic steps (parse, install, state) are host
 * tools; understanding and generation stay with the agent. Gate tools
 * return the gate's waiting state instead of fabricating progress.
 * @module @dsh-external/dsh-book2skill/tools
 */
import type { Book2SkillService } from './service.ts';
/** Tool names (kept in one place for diagnostics + tests). */
export declare const TOOL_NAMES: readonly ["book2skill_start", "book2skill_parse", "book2skill_get_job", "book2skill_stage_note", "book2skill_read_chapter", "book2skill_zlib_search", "book2skill_download", "book2skill_import_ocr", "book2skill_install", "book2skill_cancel"];
export declare function registerBook2SkillTools(service: Book2SkillService): (() => void)[];
