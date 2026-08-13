/**
 * Book2SkillService: the single host-side seam both the agent tools and the
 * HTTP panel endpoints call. It owns the storage domain handle, job
 * transitions, parse orchestration, gates, z-lib transfers, and install.
 * @module dsh-book2skill/service
 */
import { existsSync, copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { book2skillDomain } from "./domain.js";
import { Book2SkillError, bookKeyOf, chaptersDir, ensureWorkDir, failJob, jobHandle, makeJobId, newJob, stageOfStatus, workDir, } from "./jobs.js";
import { bookPathOf, parseBook, readChapter } from "./parse.js";
import { downloadZlib, searchZlib } from "./zlib.js";
import { installSkill } from "./install.js";
import { INSTALL_TARGET_LABELS } from "./types.js";
export class Book2SkillService {
    ctx;
    domainPromise;
    constructor(ctx) {
        this.ctx = ctx;
    }
    /** Lazily open the domain; one handle for the plugin lifetime. */
    domain() {
        if (this.domainPromise === undefined) {
            this.domainPromise = this.ctx.storageDomain.open(book2skillDomain).then(domain => {
                return jobHandle(domain);
            });
        }
        return this.domainPromise;
    }
    async close() {
        if (this.domainPromise === undefined)
            return;
        const handle = await this.domainPromise;
        // The facility closes still-open domains on unmount; nothing to do here
        // beyond settling (kept for symmetry with the daily-progress pattern).
        void handle;
    }
    // ── jobs ──────────────────────────────────────────────────────────────
    async listJobs() {
        const handle = await this.domain();
        return handle.list().map(job => ({
            id: job.id,
            status: job.status,
            stage: stageOfStatus(job.status),
            title: job.book.title ?? basename(job.book.path ?? job.book.url ?? '未命名书籍'),
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        }));
    }
    async getJob(jobId) {
        const handle = await this.domain();
        const job = handle.get(jobId);
        if (job === undefined)
            throw new Book2SkillError(`未知任务 ${jobId}`);
        return job;
    }
    /** Create a job from a local path, a z-lib download URL, or a bare title. */
    async startJob(input) {
        const handle = await this.domain();
        const id = makeJobId();
        ensureWorkDir(id);
        const book = { kind: 'local', title: input.title };
        if (input.bookPath !== undefined && input.bookPath.trim() !== '') {
            if (!existsSync(input.bookPath))
                throw new Book2SkillError(`书籍文件不存在：${input.bookPath}`);
            book.path = input.bookPath;
            if (input.title === undefined)
                book.title = basename(input.bookPath).replace(/\.(epub|pdf)$/i, '');
        }
        else if (input.downloadUrl !== undefined && input.downloadUrl.trim() !== '') {
            book.kind = 'zlib';
            book.url = input.downloadUrl;
            await handle.put(newJob(id, book));
            const dl = await downloadZlib(this.ctx, input.downloadUrl, join(workDir(id), 'book-file'), undefined);
            if (!dl.ok)
                return failJob(handle, id, new Error(dl.error ?? '下载失败'));
            book.path = dl.path;
            if (input.title === undefined && dl.path !== undefined)
                book.title = basename(dl.path).replace(/\.(epub|pdf)$/i, '');
        }
        else if (input.title === undefined) {
            throw new Book2SkillError('请提供 bookPath（本地书籍路径）或 downloadUrl（z-lib 下载路径）或 title');
        }
        await handle.put(newJob(id, book));
        return this.getJob(id);
    }
    async parse(jobId, signal) {
        const handle = await this.domain();
        const job = handle.get(jobId);
        if (job === undefined)
            throw new Book2SkillError(`未知任务 ${jobId}`);
        if (job.status === 'cancelled')
            throw new Book2SkillError('任务已取消，无法解析');
        try {
            await parseBook(this.ctx, handle, job, signal);
        }
        catch (error) {
            const current = handle.get(jobId);
            if (current !== undefined && current.status !== 'cancelled')
                await failJob(handle, jobId, error);
            throw error;
        }
        return this.getJob(jobId);
    }
    /** Record an intermediate artifact; kinds map onto gate transitions. */
    async addNote(jobId, input) {
        const handle = await this.domain();
        const note = {
            kind: input.kind ?? 'other',
            title: input.title,
            text: input.text,
            at: new Date().toISOString(),
        };
        const advanceTo = input.advanceTo;
        return handle.update(jobId, j => {
            if (note.kind === 'draft') {
                j.skill.draft = note.text;
                j.skill.name = note.title.trim() === '' ? j.skill.name : note.title;
                // A new draft resets the previous verdict + self-check.
                j.gate2.status = 'open';
                j.gate2.verdict = undefined;
                j.skill.selfcheck = [];
                j.status = advanceTo ?? 'awaiting_gate2';
            }
            else if (note.kind === 'questions') {
                j.notes.push({ ...note, kind: 'other' });
                j.status = advanceTo ?? 'awaiting_gate1';
            }
            else {
                j.notes.push(note);
                if (advanceTo !== undefined)
                    j.status = advanceTo;
            }
            j.stage = stageOfStatus(j.status);
        });
    }
    /** Record the ≤3 gate-1 questions the agent designed. */
    async setQuestions(jobId, questions) {
        if (questions.length === 0 || questions.length > 3) {
            throw new Book2SkillError('门控1问题数量必须在 1-3 个之间');
        }
        const handle = await this.domain();
        return handle.update(jobId, j => {
            j.gate1 = { status: 'open', questions };
            j.status = 'awaiting_gate1';
            j.stage = 3;
            j.notes.push({
                kind: 'questions', title: '门控1问题', text: JSON.stringify(questions), at: new Date().toISOString(),
            });
        });
    }
    /** Panel posts answers; the job moves to deep_reading for the agent to poll. */
    async answerGate1(jobId, answers) {
        const handle = await this.domain();
        return handle.update(jobId, j => {
            if (j.gate1.status !== 'open')
                throw new Book2SkillError('门控1当前不在等待状态');
            j.gate1.answers = answers;
            j.gate1.status = 'answered';
            j.status = 'deep_reading';
            j.stage = 3;
            j.notes.push({
                kind: 'other', title: '门控1回答', text: JSON.stringify(answers), at: new Date().toISOString(),
            });
        });
    }
    /** Record one self-check item (id is one of the three canonical checks). */
    async addSelfCheck(jobId, item) {
        const handle = await this.domain();
        return handle.update(jobId, j => {
            const index = j.skill.selfcheck.findIndex(existing => existing.id === item.id);
            const record = { id: item.id, title: item.title, pass: item.pass, note: item.note };
            if (index >= 0)
                j.skill.selfcheck[index] = record;
            else
                j.skill.selfcheck.push(record);
            j.skill.selfcheck.sort((a, b) => a.id.localeCompare(b.id));
        });
    }
    /** Panel saves an edit to the draft without changing the gate verdict. */
    async saveDraft(jobId, draft) {
        const handle = await this.domain();
        return handle.update(jobId, j => {
            j.skill.draft = draft;
        });
    }
    /** Panel posts the gate-2 verdict (pass / regenerate) with optional edited draft. */
    async decideGate2(jobId, verdict, editedDraft) {
        const handle = await this.domain();
        return handle.update(jobId, j => {
            if (j.gate2.status !== 'open')
                throw new Book2SkillError('门控2当前不在等待状态');
            if (editedDraft !== undefined && editedDraft.trim() !== '')
                j.skill.draft = editedDraft;
            j.gate2.verdict = verdict;
            j.gate2.status = 'decided';
            if (verdict === 'pass') {
                j.status = 'awaiting_gate3';
                j.stage = 5;
            }
            else {
                j.status = 'drafting';
                j.stage = 4;
            }
        });
    }
    /** Panel selects/confirms install targets. */
    async setTargets(jobId, targets) {
        const valid = targets.filter((target) => target === 'claude' || target === 'codex' || target === 'kk_skill');
        const handle = await this.domain();
        return handle.update(jobId, j => {
            j.install.targets = [...new Set(valid)];
        });
    }
    async confirmInstall(jobId) {
        const handle = await this.domain();
        return handle.update(jobId, j => {
            if (j.install.targets.length === 0)
                throw new Book2SkillError('请先勾选至少一个安装目标');
            j.install.confirmed = true;
            j.status = 'installing';
            j.stage = 5;
        });
    }
    /** Gate 3 lives in the tool: unconfirmed install refuses with a gate message. */
    async install(jobId, input) {
        const handle = await this.domain();
        const job = handle.get(jobId);
        if (job === undefined)
            throw new Book2SkillError(`未知任务 ${jobId}`);
        if (job.install.confirmed !== true) {
            throw new Book2SkillError('门控3未通过：安装目标尚未在面板确认。请在面板勾选目标并点击“确认安装”，或先调用 book2skill_stage_note 记录目标。');
        }
        const targets = (input.targets ?? job.install.targets).filter((target) => target === 'claude' || target === 'codex' || target === 'kk_skill');
        if (targets.length === 0)
            throw new Book2SkillError('安装目标为空');
        const trimmedName = input.name?.trim();
        if (trimmedName !== undefined && trimmedName !== '') {
            await handle.update(jobId, j => { j.skill.name = trimmedName; });
        }
        const latest = await this.getJob(jobId);
        const results = installSkill(latest, { targets, overwrite: input.overwrite === true });
        return handle.update(jobId, j => {
            j.install.result = results;
            j.status = 'installed';
            j.stage = 5;
        });
    }
    async cancel(jobId) {
        const handle = await this.domain();
        return handle.update(jobId, j => {
            if (j.status === 'installed' || j.status === 'cancelled') {
                throw new Book2SkillError('任务已结束，无法取消');
            }
            j.status = 'cancelled';
            j.cancelledAt = new Date().toISOString();
            j.stage = stageOfStatus('cancelled');
        });
    }
    /**
     * Agent-driven OCR fallback: import per-page markdown produced by the
     * paddle_ocr_layout tool (or any per-page .md directory) into the job's
     * chapters dir, then mark the job parsed.
     */
    async importOcr(jobId, inputDir) {
        const handle = await this.domain();
        const job = handle.get(jobId);
        if (job === undefined)
            throw new Book2SkillError(`未知任务 ${jobId}`);
        if (!existsSync(inputDir))
            throw new Book2SkillError(`导入目录不存在：${inputDir}`);
        const files = readdirSync(inputDir).filter(name => name.endsWith('.md') && name !== 'toc.md').sort();
        if (files.length === 0)
            throw new Book2SkillError(`导入目录没有 .md 文件：${inputDir}`);
        const outDir = chaptersDir(jobId, bookKeyOf(job));
        mkdirSync(outDir, { recursive: true });
        const chapters = [];
        const tocLines = ['# 章节目录（OCR 导入）'];
        for (let index = 0; index < files.length; index++) {
            const source = join(inputDir, files[index]);
            const target = join(outDir, files[index]);
            copyFileSync(source, target);
            const content = readFileSync(target, 'utf8');
            const title = files[index].replace(/\.md$/, '').replace(/^doc_\d+_?/, '');
            chapters.push({ file: files[index], title: title || `第 ${index + 1} 页`, chars: content.replace(/\s/g, '').length });
            tocLines.push(`${index + 1}. [${title || `第 ${index + 1} 页`}](${files[index]})`);
        }
        writeFileSync(join(outDir, 'toc.md'), tocLines.join('\n'), 'utf8');
        return handle.update(jobId, j => {
            j.parse.kind = 'pdf-ocr';
            j.parse.outDir = outDir;
            j.parse.chapters = chapters;
            j.parse.toc = tocLines.join('\n');
            j.parse.ocr = { state: 'done', page: files.length, total: files.length, message: '已导入 agent OCR 结果' };
            j.status = 'parsed';
            j.stage = 2;
        });
    }
    async readChapter(jobId, file, offset, limit) {
        const job = await this.getJob(jobId);
        const chapter = job.parse.chapters.find(c => c.file === file);
        if (chapter === undefined)
            throw new Book2SkillError(`未知章节文件：${file}（见 parse.chapters 列表）`);
        const outDir = job.parse.outDir;
        if (outDir === undefined)
            throw new Book2SkillError('解析尚未完成');
        const text = readChapter(outDir, file, 200_000);
        const lines = text.split('\n');
        const start = Math.max(0, offset - 1);
        const slice = lines.slice(start, start + limit);
        return { file, text: slice.join('\n'), truncated: start + limit < lines.length };
    }
    async zlibSearch(query) {
        return searchZlib(this.ctx, query);
    }
    async zlibDownload(jobId, downloadPath) {
        const handle = await this.domain();
        const job = handle.get(jobId);
        if (job === undefined)
            throw new Book2SkillError(`未知任务 ${jobId}`);
        const dest = join(workDir(jobId), `book-${Date.now()}`);
        await handle.update(jobId, j => { j.status = 'fetching'; j.stage = 1; });
        const result = await downloadZlib(this.ctx, downloadPath, dest, undefined);
        if (!result.ok || result.path === undefined) {
            const failed = await failJob(handle, jobId, new Error(result.error ?? '下载失败'));
            return failed;
        }
        return handle.update(jobId, j => {
            j.book = { kind: 'zlib', path: result.path, url: downloadPath, title: j.book.title };
            j.status = 'pending';
            j.stage = 1;
        });
    }
    /** Panel-facing job surface (title is cheap; full record rides snapshot). */
    describeJob(job) {
        const chapter = job.parse.chapters[0];
        return {
            id: job.id,
            status: job.status,
            stage: stageOfStatus(job.status),
            title: job.book.title ?? (job.book.path === undefined ? undefined : basename(job.book.path)),
            book: job.book,
            chapters: job.parse.chapters,
            toc: job.parse.toc,
            ocr: job.parse.ocr,
            notes: job.notes,
            gate1: { status: job.gate1.status, questions: job.gate1.questions, answers: job.gate1.answers },
            skill: job.skill,
            gate2: job.gate2,
            install: job.install,
            error: job.error,
            firstChapter: chapter,
            targetLabels: INSTALL_TARGET_LABELS,
            bookPath: bookPathOf(job),
        };
    }
}
