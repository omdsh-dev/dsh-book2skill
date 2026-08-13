/**
 * Parse engine: EPUB → parse_epub.py (chapter md + toc); text PDF →
 * PyPDF2 50-page chunks; scanned PDF → OCR backend with per-page progress.
 * All file work is plain Node fs (host plugin), subprocess work rides
 * ctx.shell. Progress lands on the job record so the panel snapshot shows
 * it while polling.
 * @module @dsh-external/dsh-book2skill/parse
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chaptersDir, bookKeyOf } from "./jobs.js";
import { ocrPdf } from "./ocr.js";
import { shellCommand } from "./shell.js";
const SCRIPTS_DIR = fileURLToPath(new URL('../scripts', import.meta.url));
/** Where a copy of the source book is kept for this job. */
export function bookPathOf(job) {
    return job.book.path;
}
export function detectFormat(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.epub'))
        return 'epub';
    if (lower.endsWith('.pdf'))
        return 'pdf';
    return 'other';
}
/** Run python3 through the host shell service with bounded output and cancellation. */
async function runPython(ctx, script, args, signal, timeoutMs = 600_000) {
    const spec = ctx.shell.resolve({
        command: shellCommand('python3', [script, ...args]),
        workdir: SCRIPTS_DIR,
        timeoutMs,
        stdoutMaxBytes: 2 * 1024 * 1024,
        signal,
    });
    const result = await ctx.shell.run(spec);
    if (result.exitCode !== 0) {
        const stderr = result.stderr.text.slice(-2000);
        throw new Error(`python3 ${basename(script)} 失败 (exit ${result.exitCode ?? result.signal}): ${stderr || result.stdout.text.slice(-500)}`);
    }
    return { stdout: result.stdout.text, stderr: result.stderr.text };
}
/** List produced chapter files into ChapterInfo rows. */
export function listChapters(dir) {
    const rows = [];
    for (const name of readdirSync(dir).sort()) {
        if (!name.endsWith('.md') || name === 'toc.md')
            continue;
        const file = join(dir, name);
        const content = readFileSync(file, 'utf8');
        rows.push({ file: name, title: name.replace(/^ch\d+-/, '').replace(/\.md$/, ''), chars: content.replace(/\s/g, '').length });
    }
    return rows;
}
function parseProbe(stdout) {
    const total = Number(/total=(\d+)/.exec(stdout)?.[1] ?? 0);
    const effectiveChars = Number(/effective_chars=(\d+)/.exec(stdout)?.[1] ?? 0);
    const garbled = Number(/garbled=(\d+)/.exec(stdout)?.[1] ?? 0);
    return { total, effectiveChars, garbled };
}
/** Parse one book into the job's chapters directory; drives job.parse progress. */
export async function parseBook(ctx, handle, job, signal) {
    const path = bookPathOf(job);
    if (path === undefined)
        throw new Error('任务没有书籍文件：请先提供本地路径或完成下载');
    const format = detectFormat(path);
    const bookKey = bookKeyOf(job);
    const outDir = chaptersDir(job.id, bookKey);
    if (format === 'epub') {
        await handle.update(job.id, j => {
            j.status = 'parsing';
            j.parse.kind = 'epub';
            j.parse.outDir = outDir;
        });
        await runPython(ctx, join(SCRIPTS_DIR, 'parse_epub.py'), [path, outDir], signal);
        const chapters = listChapters(outDir);
        const toc = readToc(outDir);
        await handle.update(job.id, j => {
            j.status = 'parsed';
            j.parse.chapters = chapters;
            j.parse.toc = toc;
            j.book.format = 'epub';
        });
        return;
    }
    if (format !== 'pdf') {
        throw new Error(`不支持的书籍格式：${format}。支持 EPUB / PDF（可先用本地 EPUB 或转换工具）`);
    }
    await handle.update(job.id, j => {
        j.status = 'parsing';
        j.parse.outDir = outDir;
        j.book.format = 'pdf';
    });
    // 决策树：前 50 页 PyPDF2 提取，有效字 ≥5000 且无乱码 → 文本型 PDF。
    const probe = parseProbe((await runPython(ctx, join(SCRIPTS_DIR, 'pdf_parse.py'), ['probe', path], signal)).stdout);
    const scanned = probe.effectiveChars < 5000 || probe.garbled > probe.effectiveChars / 2;
    if (!scanned) {
        await handle.update(job.id, j => {
            j.parse.kind = 'pdf-text';
            j.parse.pdfPages = probe.total;
        });
        await runPython(ctx, join(SCRIPTS_DIR, 'pdf_parse.py'), ['extract', path, outDir], signal);
        const chapters = listChapters(outDir);
        const toc = readToc(outDir);
        await handle.update(job.id, j => {
            j.status = 'parsed';
            j.parse.chapters = chapters;
            j.parse.toc = toc;
        });
        return;
    }
    // 扫描型 → OCR（服务优先，缺省 HTTP 直调）
    const totalPages = probe.total;
    await handle.update(job.id, j => {
        j.parse.kind = 'pdf-ocr';
        j.parse.pdfPages = totalPages;
        j.parse.ocr = { state: 'running', page: 0, total: totalPages };
    });
    const report = async (progress) => {
        try {
            await handle.update(job.id, j => {
                j.parse.ocr = { ...progress, total: totalPages };
            });
        }
        catch {
            // 任务已被取消/删除：进度上报静默失败
        }
    };
    try {
        await ocrPdf(ctx, path, outDir, totalPages, progress => { void report(progress); }, signal);
    }
    catch (error) {
        await report({ state: 'error', page: 0, total: totalPages, message: error instanceof Error ? error.message : String(error) });
        throw error;
    }
    const chapters = listChapters(outDir);
    await handle.update(job.id, j => {
        j.status = 'parsed';
        j.parse.chapters = chapters;
        j.parse.ocr = { state: 'done', page: totalPages, total: totalPages, message: 'OCR 完成' };
    });
}
function readToc(dir) {
    try {
        return readFileSync(join(dir, 'toc.md'), 'utf8');
    }
    catch {
        return undefined;
    }
}
/** Read one chapter file (agent-facing helper; bounded read). */
export function readChapter(outDir, file, maxChars = 60_000) {
    const full = readFileSync(join(outDir, file), 'utf8');
    if (full.length <= maxChars)
        return full;
    return `${full.slice(0, maxChars)}\n\n…（已截断，原 ${full.length} 字符；可分段续读同一文件）`;
}
/** Book file size, for display. */
export function bookSize(path) {
    try {
        return statSync(path).size;
    }
    catch {
        return undefined;
    }
}
