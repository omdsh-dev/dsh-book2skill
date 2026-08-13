/**
 * Job state machine and work-directory management. The domain table is the
 * single source of truth; every transition goes through {@link updateJob}
 * so the panel snapshot and tool results can never drift from the stored
 * record. Filesystem artifacts live under /tmp/book2skill-work/<jobId>/.
 * @module @dsh-external/dsh-book2skill/jobs
 */
import type { Book2SkillJob, JobStatus, JobStage } from './types.ts';
export declare const WORK_ROOT: string;
/** Local, structurally-typed view of the host's storage-domain facilities. */
export interface KvTableLike<K extends string, V> {
    get(key: K): V | undefined;
    put(key: K, value: V): Promise<void>;
    update(key: K, fn: (current: V) => V): Promise<V>;
    delete(key: K): Promise<boolean>;
    entries(): IterableIterator<[K, V]>;
}
export interface DomainHandleLike {
    table(name: string): KvTableLike<string, unknown>;
    close(): Promise<void>;
}
/** Absolute work directory for one job; chapters land in <dir>/chapters/<bookKey>/. */
export declare function workDir(jobId: string): string;
export declare function chaptersDir(jobId: string, bookKey: string): string;
export declare function bookKeyOf(job: Book2SkillJob): string;
/** One filesystem-safe key per book (directory + reference names). */
export declare function sanitizeBookKey(raw: string): string;
export type JobTable = KvTableLike<string, Book2SkillJob>;
export interface JobHandle {
    table: JobTable;
    get(jobId: string): Book2SkillJob | undefined;
    put(job: Book2SkillJob): Promise<void>;
    /** Read-modify-write one job; rejects when the job is unknown. */
    update(jobId: string, fn: (job: Book2SkillJob) => void): Promise<Book2SkillJob>;
    list(): Book2SkillJob[];
}
/** Wrap the opened domain's jobs table with the transition helpers. */
export declare function jobHandle(domain: DomainHandleLike): JobHandle;
export declare function newJob(id: string, book: Book2SkillJob['book']): Book2SkillJob;
/** Ensure the job's work directory exists. */
export declare function ensureWorkDir(jobId: string): string;
/**
 * Status → timeline stage projection: where the panel's timeline highlight
 * sits for every status.
 */
export declare function stageOfStatus(status: JobStatus): JobStage;
/** Fail a job, keeping the failure reason on the record. */
export declare function failJob(handle: JobHandle, jobId: string, error: unknown): Promise<Book2SkillJob>;
/** One canonical runtime error the tools turn into readable results. */
export declare class Book2SkillError extends Error {
}
/** Panel-safe id generator (no crypto dependence). */
export declare function makeJobId(): string;
