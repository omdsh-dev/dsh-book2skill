/**
 * Book2SkillService: the single host-side seam both the agent tools and the
 * HTTP panel endpoints call. It owns the storage domain handle, job
 * transitions, parse orchestration, gates, z-lib transfers, and install.
 * @module dsh-book2skill/service
 */
import type { Context } from '@deepseek-ai/cordis';
import { searchZlib } from './zlib.ts';
import type { Book2SkillJob, GateAnswer, GateQuestion, InstallTarget, JobListRow, SelfCheckItem, StageNote } from './types.ts';
export interface StartInput {
    bookPath?: string;
    downloadUrl?: string;
    title?: string;
}
export interface NoteInput {
    kind?: StageNote['kind'];
    title: string;
    text: string;
    /** Optional explicit transition after the note lands. */
    advanceTo?: 'awaiting_gate1' | 'awaiting_gate2' | 'deep_reading' | 'drafting' | 'parsed';
}
export interface SelfCheckInput {
    id: SelfCheckItem['id'];
    title: string;
    pass: boolean;
    note: string;
}
export interface InstallInput {
    name?: string;
    targets?: InstallTarget[];
    overwrite?: boolean;
}
export declare class Book2SkillService {
    readonly ctx: Context;
    private domainPromise;
    constructor(ctx: Context);
    /** Lazily open the domain; one handle for the plugin lifetime. */
    private domain;
    close(): Promise<void>;
    listJobs(): Promise<JobListRow[]>;
    getJob(jobId: string): Promise<Book2SkillJob>;
    /** Create a job from a local path, a z-lib download URL, or a bare title. */
    startJob(input: StartInput): Promise<Book2SkillJob>;
    parse(jobId: string, signal?: AbortSignal): Promise<Book2SkillJob>;
    /** Record an intermediate artifact; kinds map onto gate transitions. */
    addNote(jobId: string, input: NoteInput): Promise<Book2SkillJob>;
    /** Record the ≤3 gate-1 questions the agent designed. */
    setQuestions(jobId: string, questions: GateQuestion[]): Promise<Book2SkillJob>;
    /** Panel posts answers; the job moves to deep_reading for the agent to poll. */
    answerGate1(jobId: string, answers: GateAnswer[]): Promise<Book2SkillJob>;
    /** Record one self-check item (id is one of the three canonical checks). */
    addSelfCheck(jobId: string, item: SelfCheckInput): Promise<Book2SkillJob>;
    /** Panel saves an edit to the draft without changing the gate verdict. */
    saveDraft(jobId: string, draft: string): Promise<Book2SkillJob>;
    /** Panel posts the gate-2 verdict (pass / regenerate) with optional edited draft. */
    decideGate2(jobId: string, verdict: 'pass' | 'regenerate', editedDraft?: string): Promise<Book2SkillJob>;
    /** Panel selects/confirms install targets. */
    setTargets(jobId: string, targets: InstallTarget[]): Promise<Book2SkillJob>;
    confirmInstall(jobId: string): Promise<Book2SkillJob>;
    /** Gate 3 lives in the tool: unconfirmed install refuses with a gate message. */
    install(jobId: string, input: InstallInput): Promise<Book2SkillJob>;
    cancel(jobId: string): Promise<Book2SkillJob>;
    /**
     * Agent-driven OCR fallback: import per-page markdown produced by the
     * paddle_ocr_layout tool (or any per-page .md directory) into the job's
     * chapters dir, then mark the job parsed.
     */
    importOcr(jobId: string, inputDir: string): Promise<Book2SkillJob>;
    readChapter(jobId: string, file: string, offset: number, limit: number): Promise<{
        file: string;
        text: string;
        truncated: boolean;
    }>;
    zlibSearch(query: string): Promise<ReturnType<typeof searchZlib>>;
    zlibDownload(jobId: string, downloadPath: string): Promise<Book2SkillJob>;
    /** Panel-facing job surface (title is cheap; full record rides snapshot). */
    describeJob(job: Book2SkillJob): Record<string, unknown>;
}
