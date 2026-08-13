/**
 * OCR adapter with three tiers, probed at call time (no hard dependency):
 *
 *  1. `paddleOcr` host service        — the dsh-paddle-ocr plugin's future
 *     published service (contract in vendor-shims.d.ts).
 *  2. `/paddle-ocr` loopback RPC      — the installed dsh-paddle-ocr
 *     plugin's panel task channel (task/start → task/status poll →
 *     task/commit), driven over the documented wire envelope.
 *  3. Direct HTTP endpoint            — a standalone OCR stub
 *     (BOOK2SKILL_OCR_ENDPOINT, default http://127.0.0.1:8011/api/pdf/ocr).
 *
 * Every degraded run records a clear `state`/`message` on the job so the
 * panel shows exactly what happened (排队中 / 逐页进度 / 不可用).
 * @module @dsh-external/dsh-book2skill/ocr
 */
import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
/** Default HTTP endpoint for the standalone OCR stub (dsh-paddle-ocr's HTTP mode). */
export const DEFAULT_OCR_ENDPOINT = 'http://127.0.0.1:8011/api/pdf/ocr';
const PADDLE_CHANNEL = '/paddle-ocr';
const MAX_RPC_BYTES = 30 * 1024 * 1024;
/**
 * Run OCR over a scanned PDF into per-page markdown files.
 * @returns the produced page count and file list.
 */
export async function ocrPdf(ctx, pdfPath, outputDir, totalPages, report, signal) {
    // Tier 1: published service.
    const service = probeService(ctx);
    if (service !== undefined) {
        report({ state: 'running', page: 0, total: totalPages, message: 'OCR 服务已就绪，开始逐页识别' });
        return service.parsePdf(pdfPath, {
            outputDir,
            signal,
            onProgress: progress => report({
                state: progress.state,
                page: progress.page,
                total: progress.total,
                message: progress.message,
                queued: progress.state === 'queued',
            }),
        });
    }
    // Tier 2: dsh-paddle-ocr loopback RPC (installed plugin).
    const rpc = await tryPaddleRpc(ctx, pdfPath, outputDir, totalPages, report, signal);
    if (rpc !== undefined)
        return rpc;
    // Tier 3: standalone HTTP stub.
    const http = await tryHttpStub(ctx, pdfPath, outputDir, totalPages, report, signal);
    if (http !== undefined)
        return http;
    report({
        state: 'error',
        page: 0,
        total: totalPages,
        message: 'OCR 不可用：dsh-paddle-ocr 服务/RPC 与 HTTP 端点均不可达。可让 agent 用 paddle_ocr_layout 工具解析后调用 book2skill_import_ocr 导入。',
    });
    throw new Error('OCR 不可用：未安装 dsh-paddle-ocr 且 HTTP 端点不可达（可用 paddle_ocr_layout 工具 + book2skill_import_ocr 走 agent 路径）');
}
function probeService(ctx) {
    try {
        const service = ctx.get('paddleOcr');
        return service;
    }
    catch {
        return undefined;
    }
}
// ── tier 2: paddle-ocr loopback RPC ─────────────────────────────────────
async function tryPaddleRpc(ctx, pdfPath, outputDir, totalPages, report, signal) {
    const port = ctx.webServer.port;
    const bytes = readFileSync(pdfPath);
    if (bytes.byteLength > MAX_RPC_BYTES) {
        report({ state: 'running', page: 0, total: totalPages, message: `PDF 超过 paddle-ocr 面板通道上限（30MB），改用 HTTP 端点或 agent 工具路径` });
        return undefined;
    }
    report({ state: 'running', page: 0, total: totalPages, message: '检测到 dsh-paddle-ocr，提交 OCR 任务…' });
    const start = await rpcCall(port, 'task/start', {
        name: pdfPath.split('/').pop() ?? 'book.pdf',
        dataB64: bytes.toString('base64'),
        mode: 'async',
    }, signal);
    if (start === undefined || !start.ok) {
        report({ state: 'running', page: 0, total: totalPages, message: 'paddle-ocr RPC 不可用，改用 HTTP 端点…' });
        return undefined;
    }
    const jobId = String(start.value?.jobId ?? '');
    if (jobId === '')
        return undefined;
    for (;;) {
        if (signal?.aborted)
            throw new Error('OCR 已取消');
        const status = await rpcCall(port, 'task/status', { jobId }, signal);
        if (status === undefined || !status.ok)
            break;
        const value = status.value;
        const phase = value.phase ?? 'unknown';
        if (phase === 'queued') {
            report({ state: 'queued', page: 0, total: value.totalPages ?? totalPages, message: value.detail ?? '排队中', queued: true });
        }
        else if (phase === 'running' || phase === 'checking' || phase === 'splitting' || phase === 'submitting' || phase === 'downloading') {
            report({ state: 'running', page: value.page ?? 0, total: value.totalPages ?? totalPages, message: value.detail });
        }
        else if (phase === 'queue-full') {
            report({ state: 'queued', page: 0, total: value.totalPages ?? totalPages, message: value.detail ?? '队列已满，自动退避重试中', queued: true });
        }
        else if (phase === 'done') {
            report({ state: 'running', page: value.totalPages ?? totalPages, total: value.totalPages ?? totalPages, message: 'OCR 完成，写入章节文件…' });
            const commit = await rpcCall(port, 'task/commit', { jobId, outputDir }, signal);
            if (commit !== undefined && commit.ok) {
                const out = commit.value;
                report({ state: 'done', page: out.pageCount ?? value.totalPages ?? totalPages, total: value.totalPages ?? totalPages, message: 'OCR 完成' });
                return { pages: out.pageCount ?? totalPages, files: out.files ?? [] };
            }
            throw new Error(`OCR 完成但落盘失败：${commit?.error?.message ?? '未知错误'}`);
        }
        else if (phase === 'failed') {
            report({ state: 'error', page: value.page ?? 0, total: value.totalPages ?? totalPages, message: value.detail ?? 'OCR 失败' });
            throw new Error(`OCR 失败：${value.detail ?? '未知错误'}`);
        }
        await sleep(1500, signal);
    }
    return undefined;
}
/** One loopback RPC call over the documented wire envelope. */
function rpcCall(port, endpoint, payload, signal) {
    return new Promise(resolve => {
        const body = JSON.stringify({
            type: 'client-request',
            rpcId: `b2s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            method: endpoint,
            payload,
        });
        const req = httpRequest({
            host: '127.0.0.1',
            port,
            path: `${PADDLE_CHANNEL}/${endpoint}`,
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(body),
            },
            timeout: 20_000,
        }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    resolve(undefined);
                    return;
                }
                try {
                    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    resolve(parsed.result ?? { ok: false, error: { code: 'bad-response', message: '响应缺少 result' } });
                }
                catch {
                    resolve(undefined);
                }
            });
        });
        req.on('error', () => resolve(undefined));
        req.on('timeout', () => { req.destroy(); resolve(undefined); });
        if (signal !== undefined) {
            signal.addEventListener('abort', () => { req.destroy(); resolve(undefined); }, { once: true });
        }
        req.end(body);
    });
}
// ── tier 3: standalone HTTP stub ────────────────────────────────────────
async function tryHttpStub(ctx, pdfPath, outputDir, totalPages, report, signal) {
    const endpoint = (process.env.BOOK2SKILL_OCR_ENDPOINT ?? DEFAULT_OCR_ENDPOINT).trim();
    if (endpoint === '')
        return undefined;
    report({ state: 'running', page: 0, total: totalPages, message: 'dsh-paddle-ocr 不可用，降级为 HTTP 直调 OCR' });
    const submit = await stubJson(ctx, withQuery(endpoint, { pdfPath, outputDir }), signal);
    if (submit === undefined || !submit.ok)
        return undefined;
    const taskId = String(submit.taskId ?? '');
    if (taskId === '')
        return undefined;
    for (;;) {
        if (signal?.aborted)
            throw new Error('OCR 已取消');
        const poll = await stubJson(ctx, withQuery(endpoint, { task: taskId }), signal);
        if (poll === undefined || !poll.ok)
            throw new Error(`OCR HTTP 查询失败：${poll?.error ?? '端点不可达'}`);
        const state = poll.state;
        if (state === 'queued') {
            report({ state: 'queued', page: Number(poll.page ?? 0), total: totalPages, message: '排队中', queued: true });
        }
        else if (state === 'running') {
            report({ state: 'running', page: Number(poll.page ?? 0), total: totalPages, message: poll.message });
        }
        else if (state === 'done') {
            report({ state: 'done', page: totalPages, total: totalPages, message: 'OCR 完成' });
            return { pages: totalPages, files: poll.files ?? [] };
        }
        else if (state === 'error') {
            throw new Error(`OCR 失败：${poll.message ?? '未知错误'}`);
        }
        await sleep(1500, signal);
    }
}
async function stubJson(ctx, url, signal) {
    try {
        const response = await ctx.web.fetch({ url }, signal);
        if (response.statusCode >= 400)
            return { ok: false, error: `HTTP ${response.statusCode}` };
        return JSON.parse(response.body.content);
    }
    catch {
        return undefined;
    }
}
/** The web fetch seam is GET-only; the fallback endpoint accepts GET query params. */
function withQuery(url, params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
        query.set(key, String(value));
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${query.toString()}`;
}
function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('OCR 已取消'));
        }, { once: true });
    });
}
