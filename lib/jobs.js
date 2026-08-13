/**
 * Job state machine and work-directory management. The domain table is the
 * single source of truth; every transition goes through {@link updateJob}
 * so the panel snapshot and tool results can never drift from the stored
 * record. Filesystem artifacts live under /tmp/book2skill-work/<jobId>/.
 * @module @dsh-external/dsh-book2skill/jobs
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
export const WORK_ROOT = join('/tmp', 'book2skill-work');
/** Absolute work directory for one job; chapters land in <dir>/chapters/<bookKey>/. */
export function workDir(jobId) {
    return join(WORK_ROOT, jobId);
}
export function chaptersDir(jobId, bookKey) {
    return join(workDir(jobId), 'chapters', bookKey);
}
export function bookKeyOf(job) {
    return sanitizeBookKey(job.book.title ?? job.id);
}
/** One filesystem-safe key per book (directory + reference names). */
export function sanitizeBookKey(raw) {
    const key = raw.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
    return key || 'book';
}
/** Wrap the opened domain's jobs table with the transition helpers. */
export function jobHandle(domain) {
    const table = domain.table('jobs');
    return {
        table,
        get: jobId => table.get(jobId),
        put: async (job) => { await table.put(job.id, job); },
        update: async (jobId, fn) => {
            const current = table.get(jobId);
            if (current === undefined)
                throw new Book2SkillError(`未知任务 ${jobId}`);
            const next = structuredClone(current);
            fn(next);
            next.updatedAt = new Date().toISOString();
            await table.put(jobId, next);
            return next;
        },
        list: () => [...table.entries()].map(([, job]) => job).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
}
export function newJob(id, book) {
    const now = new Date().toISOString();
    return {
        id,
        status: 'pending',
        stage: 1,
        createdAt: now,
        updatedAt: now,
        book,
        parse: { chapters: [] },
        gate1: { status: 'closed', questions: [] },
        notes: [],
        skill: { selfcheck: [] },
        gate2: { status: 'closed' },
        install: { targets: [] },
    };
}
/** Ensure the job's work directory exists. */
export function ensureWorkDir(jobId) {
    const dir = workDir(jobId);
    mkdirSync(dir, { recursive: true });
    return dir;
}
/**
 * Status → timeline stage projection: where the panel's timeline highlight
 * sits for every status.
 */
export function stageOfStatus(status) {
    switch (status) {
        case 'pending':
        case 'fetching':
            return 1;
        case 'parsing':
        case 'parsed':
            return 2;
        case 'reading':
        case 'awaiting_gate1':
        case 'deep_reading':
            return 3;
        case 'drafting':
        case 'awaiting_gate2':
            return 4;
        case 'installing':
        case 'awaiting_gate3':
        case 'installed':
            return 5;
        case 'cancelled':
        case 'failed':
            return 1;
    }
}
/** Fail a job, keeping the failure reason on the record. */
export async function failJob(handle, jobId, error) {
    const message = error instanceof Error ? error.message : String(error);
    return handle.update(jobId, job => {
        job.status = 'failed';
        job.error = message;
    });
}
/** One canonical runtime error the tools turn into readable results. */
export class Book2SkillError extends Error {
}
/** Panel-safe id generator (no crypto dependence). */
export function makeJobId() {
    const now = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `b2s-${now}-${rand}`;
}
