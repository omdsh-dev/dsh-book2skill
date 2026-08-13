/**
 * Durable domain declaration: one `jobs` table keyed by job id. Rides the
 * host's storage-domain facility (`ctx.storageDomain`), routed to whatever
 * backend the deployment configured (the standard web composition: json
 * under $DSH_HOME/storages), so jobs survive restarts and cross-session
 * resume.
 *
 * Note: the spec is cast through `never` because this standalone repository
 * carries its own zod instance while the host's storage-domain package
 * references the host's zod; the runtime contract is structural (name +
 * tables + value schemas), and the zod object this module builds is the
 * very schema the domain facility validates against.
 * @module @dsh-external/dsh-book2skill/domain
 */
import z from 'zod';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
const BookSourceSchema = z.object({
    kind: z.enum(['local', 'zlib']),
    path: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
    format: z.enum(['epub', 'pdf', 'other']).optional(),
});
const ChapterInfoSchema = z.object({
    file: z.string(),
    title: z.string(),
    chars: z.number(),
});
const OcrProgressSchema = z.object({
    state: z.enum(['idle', 'running', 'queued', 'done', 'error']),
    page: z.number(),
    total: z.number(),
    message: z.string().optional(),
    queued: z.boolean().optional(),
});
const ParseStateSchema = z.object({
    kind: z.enum(['epub', 'pdf-text', 'pdf-ocr']).optional(),
    outDir: z.string().optional(),
    chapters: z.array(ChapterInfoSchema).default([]),
    toc: z.string().optional(),
    pdfPages: z.number().optional(),
    ocr: OcrProgressSchema.nullable().default(null),
    error: z.string().optional(),
});
const GateQuestionSchema = z.object({
    id: z.string(),
    question: z.string(),
    detail: z.string().optional(),
    options: z.array(z.object({ label: z.string(), context: z.string() })),
    multiSelect: z.boolean().optional(),
});
const GateAnswerSchema = z.object({
    id: z.string(),
    selected: z.array(z.string()),
    custom: z.string().optional(),
});
const Gate1StateSchema = z.object({
    status: z.enum(['closed', 'open', 'answered']),
    questions: z.array(GateQuestionSchema).default([]),
    answers: z.array(GateAnswerSchema).optional(),
});
const StageNoteSchema = z.object({
    kind: z.enum(['summary', 'knowledge-map', 'deep-read', 'draft', 'selfcheck', 'questions', 'other']),
    title: z.string(),
    text: z.string(),
    at: z.string(),
});
const SelfCheckItemSchema = z.object({
    id: z.enum(['traceability', 'index', 'triggers']),
    title: z.string(),
    pass: z.boolean(),
    note: z.string(),
});
const Gate2StateSchema = z.object({
    status: z.enum(['closed', 'open', 'decided']),
    verdict: z.enum(['pass', 'regenerate']).optional(),
});
const InstallResultItemSchema = z.object({
    target: z.enum(['claude', 'codex', 'kk_skill']),
    path: z.string(),
    ok: z.boolean(),
    error: z.string().optional(),
});
const InstallStateSchema = z.object({
    targets: z.array(z.enum(['claude', 'codex', 'kk_skill'])).default([]),
    confirmed: z.boolean().optional(),
    result: z.array(InstallResultItemSchema).optional(),
});
export const Book2SkillJobSchema = z.object({
    id: z.string(),
    status: z.string(),
    stage: z.number().int().min(1).max(5),
    createdAt: z.string(),
    updatedAt: z.string(),
    book: BookSourceSchema,
    parse: ParseStateSchema,
    gate1: Gate1StateSchema,
    notes: z.array(StageNoteSchema).default([]),
    skill: z.object({
        name: z.string().optional(),
        draft: z.string().optional(),
        selfcheck: z.array(SelfCheckItemSchema).default([]),
    }),
    gate2: Gate2StateSchema,
    install: InstallStateSchema,
    error: z.string().optional(),
    cancelledAt: z.string().optional(),
});
/** The domain spec: one `jobs` table holding one record per job id. */
export const book2skillDomain = defineDomain({
    name: 'book2skill',
    version: 1,
    tables: {
        jobs: {
            valueSchema: Book2SkillJobSchema,
        },
    },
});
