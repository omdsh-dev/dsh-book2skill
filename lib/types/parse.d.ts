/**
 * Parse engine: EPUB → parse_epub.py (chapter md + toc); text PDF →
 * PyPDF2 50-page chunks; scanned PDF → OCR backend with per-page progress.
 * All file work is plain Node fs (host plugin), subprocess work rides
 * ctx.shell. Progress lands on the job record so the panel snapshot shows
 * it while polling.
 * @module @dsh-external/dsh-book2skill/parse
 */
import type { Context } from '@deepseek-ai/cordis';
import { type JobHandle } from './jobs.ts';
import type { Book2SkillJob, ChapterInfo } from './types.ts';
/** Where a copy of the source book is kept for this job. */
export declare function bookPathOf(job: Book2SkillJob): string | undefined;
export declare function detectFormat(path: string): 'epub' | 'pdf' | 'other';
/** List produced chapter files into ChapterInfo rows. */
export declare function listChapters(dir: string): ChapterInfo[];
/** Parse one book into the job's chapters directory; drives job.parse progress. */
export declare function parseBook(ctx: Context, handle: JobHandle, job: Book2SkillJob, signal?: AbortSignal): Promise<void>;
/** Read one chapter file (agent-facing helper; bounded read). */
export declare function readChapter(outDir: string, file: string, maxChars?: number): string;
/** Book file size, for display. */
export declare function bookSize(path: string): number | undefined;
