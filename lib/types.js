/**
 * Shared job model for dsh-book2skill: the durable record every surface
 * (host tools, HTTP routes, browser panel) reads and writes.
 *
 * A job walks five stages — fetch → parse → understand → generate →
 * install — with three human gates (1: reading direction questions,
 * 2: SKILL.md draft verdict, 3: install target confirmation). The whole
 * record lives in the storage domain so a job survives restarts and
 * cross-session resume; the panel polls the snapshot endpoints.
 * @module dsh-book2skill/types
 */
/** Normalized stage ordering used by both sides. */
export const STAGES = [
    { id: 1, key: 'fetch', label: '获取书籍' },
    { id: 2, key: 'parse', label: '解析分章' },
    { id: 3, key: 'understand', label: '深度阅读' },
    { id: 4, key: 'generate', label: '生成 SKILL.md' },
    { id: 5, key: 'install', label: '安装' },
];
/** Valid stage for the tool-visible note kinds. */
export const NOTE_KINDS = ['summary', 'knowledge-map', 'deep-read', 'draft', 'selfcheck', 'questions', 'other'];
export const INSTALL_TARGET_LABELS = {
    claude: '~/.claude/skills',
    codex: '~/.codex/skills',
    kk_skill: '~/kk_skill/skills（同步仓库）',
};
