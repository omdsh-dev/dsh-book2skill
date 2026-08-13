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
/** The five timeline stages. */
export type JobStage = 1 | 2 | 3 | 4 | 5;
/** Coarse lifecycle status, folded into the panel timeline and tool results. */
export type JobStatus = 'pending' | 'fetching' | 'parsing' | 'parsed' | 'reading' | 'awaiting_gate1' | 'deep_reading' | 'drafting' | 'awaiting_gate2' | 'installing' | 'awaiting_gate3' | 'installed' | 'cancelled' | 'failed';
/** Where the book came from. */
export interface BookSource {
    kind: 'local' | 'zlib';
    path?: string;
    url?: string;
    title?: string;
    format?: 'epub' | 'pdf' | 'other';
}
/** One chapter as written by the parser. */
export interface ChapterInfo {
    file: string;
    title: string;
    chars: number;
}
/** Progress of an OCR run (page-granular, polled by the panel). */
export interface OcrProgress {
    state: 'idle' | 'running' | 'queued' | 'done' | 'error';
    page: number;
    total: number;
    message?: string;
    /** true when the OCR backend reports the job is queued rather than running. */
    queued?: boolean;
}
export interface ParseState {
    kind?: 'epub' | 'pdf-text' | 'pdf-ocr';
    outDir?: string;
    chapters: ChapterInfo[];
    toc?: string;
    pdfPages?: number;
    ocr?: OcrProgress;
    error?: string;
}
/** One agent-generated direction question (gate 1). */
export interface GateQuestion {
    id: string;
    question: string;
    detail?: string;
    options: Array<{
        label: string;
        context: string;
    }>;
    multiSelect?: boolean;
}
export interface GateAnswer {
    id: string;
    selected: string[];
    custom?: string;
}
export interface Gate1State {
    status: 'closed' | 'open' | 'answered';
    questions: GateQuestion[];
    answers?: GateAnswer[];
}
/** One self-check item (gate 2 visualization). */
export interface SelfCheckItem {
    id: 'traceability' | 'index' | 'triggers';
    title: string;
    pass: boolean;
    note: string;
}
export interface Gate2State {
    status: 'closed' | 'open' | 'decided';
    verdict?: 'pass' | 'regenerate';
}
export type InstallTarget = 'claude' | 'codex' | 'kk_skill';
export interface InstallResultItem {
    target: InstallTarget;
    path: string;
    ok: boolean;
    error?: string;
}
export interface InstallState {
    targets: InstallTarget[];
    confirmed?: boolean;
    result?: InstallResultItem[];
}
/** One intermediate artifact the agent records (summary, map, draft, ...). */
export interface StageNote {
    kind: 'summary' | 'knowledge-map' | 'deep-read' | 'draft' | 'selfcheck' | 'questions' | 'other';
    title: string;
    text: string;
    at: string;
}
export interface Book2SkillJob {
    id: string;
    status: JobStatus;
    stage: JobStage;
    createdAt: string;
    updatedAt: string;
    book: BookSource;
    parse: ParseState;
    gate1: Gate1State;
    notes: StageNote[];
    skill: {
        name?: string;
        draft?: string;
        selfcheck: SelfCheckItem[];
    };
    gate2: Gate2State;
    install: InstallState;
    error?: string;
    cancelledAt?: string;
}
/** Panel-facing job list row. */
export interface JobListRow {
    id: string;
    status: JobStatus;
    stage: JobStage;
    title: string;
    createdAt: string;
    updatedAt: string;
}
/** Normalized stage ordering used by both sides. */
export declare const STAGES: readonly {
    id: number;
    key: string;
    label: string;
}[];
/** Valid stage for the tool-visible note kinds. */
export declare const NOTE_KINDS: readonly ["summary", "knowledge-map", "deep-read", "draft", "selfcheck", "questions", "other"];
export declare const INSTALL_TARGET_LABELS: Record<InstallTarget, string>;
