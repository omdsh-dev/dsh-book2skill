/**
 * Shared job model for dsh-book2skill: the durable record every surface
 * (host tools, HTTP routes, browser panel) reads and writes.
 *
 * A job walks five stages — fetch → parse → understand → generate →
 * install — with three human gates (1: reading direction questions,
 * 2: SKILL.md draft verdict, 3: install target confirmation). The whole
 * record lives in the storage domain so a job survives restarts and
 * cross-session resume; the panel polls the snapshot endpoints.
 * @module @dsh-external/dsh-book2skill/types
 */

/** The five timeline stages. */
export type JobStage = 1 | 2 | 3 | 4 | 5

/** Coarse lifecycle status, folded into the panel timeline and tool results. */
export type JobStatus =
  | 'pending'            // created, book not fetched yet
  | 'fetching'           // z-lib download in flight
  | 'parsing'            // epub/pdf/ocr extraction running
  | 'parsed'             // chapters + toc ready
  | 'reading'            // agent shallow reading (no gate yet)
  | 'awaiting_gate1'     // GATE 1: agent posted ≤3 questions, waiting for answers
  | 'deep_reading'       // gate 1 answered, agent deep reading
  | 'drafting'           // agent writing SKILL.md draft
  | 'awaiting_gate2'     // GATE 2: draft preview + self-check verdict
  | 'installing'         // copying files into targets
  | 'awaiting_gate3'     // GATE 3: install target confirmation
  | 'installed'          // done
  | 'cancelled'
  | 'failed'

/** Where the book came from. */
export interface BookSource {
  kind: 'local' | 'zlib'
  path?: string
  url?: string
  title?: string
  format?: 'epub' | 'pdf' | 'other'
}

/** One chapter as written by the parser. */
export interface ChapterInfo {
  file: string
  title: string
  chars: number
}

/** Progress of an OCR run (page-granular, polled by the panel). */
export interface OcrProgress {
  state: 'idle' | 'running' | 'queued' | 'done' | 'error'
  page: number
  total: number
  message?: string
  /** true when the OCR backend reports the job is queued rather than running. */
  queued?: boolean
}

export interface ParseState {
  kind?: 'epub' | 'pdf-text' | 'pdf-ocr'
  outDir?: string
  chapters: ChapterInfo[]
  toc?: string
  pdfPages?: number
  ocr?: OcrProgress
  error?: string
}

/** One agent-generated direction question (gate 1). */
export interface GateQuestion {
  id: string
  question: string
  detail?: string
  options: Array<{ label: string; context: string }>
  multiSelect?: boolean
}

export interface GateAnswer {
  id: string
  selected: string[]
  custom?: string
}

export interface Gate1State {
  status: 'closed' | 'open' | 'answered'
  questions: GateQuestion[]
  answers?: GateAnswer[]
}

/** One self-check item (gate 2 visualization). */
export interface SelfCheckItem {
  id: 'traceability' | 'index' | 'triggers'
  title: string
  pass: boolean
  note: string
}

export interface Gate2State {
  status: 'closed' | 'open' | 'decided'
  verdict?: 'pass' | 'regenerate'
}

export type InstallTarget = 'claude' | 'codex' | 'kk_skill'

export interface InstallResultItem {
  target: InstallTarget
  path: string
  ok: boolean
  error?: string
}

export interface InstallState {
  targets: InstallTarget[]
  confirmed?: boolean
  result?: InstallResultItem[]
}

/** One intermediate artifact the agent records (summary, map, draft, ...). */
export interface StageNote {
  kind: 'summary' | 'knowledge-map' | 'deep-read' | 'draft' | 'selfcheck' | 'questions' | 'other'
  title: string
  text: string
  at: string
}

export interface Book2SkillJob {
  id: string
  status: JobStatus
  stage: JobStage
  createdAt: string
  updatedAt: string
  book: BookSource
  parse: ParseState
  gate1: Gate1State
  notes: StageNote[]
  skill: {
    name?: string
    draft?: string
    selfcheck: SelfCheckItem[]
  }
  gate2: Gate2State
  install: InstallState
  error?: string
  cancelledAt?: string
}

/** Panel-facing job list row. */
export interface JobListRow {
  id: string
  status: JobStatus
  stage: JobStage
  title: string
  createdAt: string
  updatedAt: string
}

/** Normalized stage ordering used by both sides. */
export const STAGES: readonly { id: number; key: string; label: string }[] = [
  { id: 1, key: 'fetch', label: '获取书籍' },
  { id: 2, key: 'parse', label: '解析分章' },
  { id: 3, key: 'understand', label: '深度阅读' },
  { id: 4, key: 'generate', label: '生成 SKILL.md' },
  { id: 5, key: 'install', label: '安装' },
] as const

/** Valid stage for the tool-visible note kinds. */
export const NOTE_KINDS = ['summary', 'knowledge-map', 'deep-read', 'draft', 'selfcheck', 'questions', 'other'] as const

export const INSTALL_TARGET_LABELS: Record<InstallTarget, string> = {
  claude: '~/.claude/skills',
  codex: '~/.codex/skills',
  kk_skill: '~/kk_skill/skills（同步仓库）',
}
