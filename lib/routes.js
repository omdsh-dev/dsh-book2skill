/**
 * HTTP surface for the browser panel. External plugins cannot extend the
 * core `/api` RPC map, so this plugin serves its own same-origin routes and
 * the panel consumes them with plain fetch (the daily-progress posture).
 *
 * Route tree (mounted at prefix `/book2skill`):
 *   GET  /book2skill/jobs                     → job list rows
 *   GET  /book2skill/jobs/:id                 → full panel snapshot
 *   POST /book2skill/jobs                     → create job (local path)
 *   POST /book2skill/jobs/:id/cancel
 *   POST /book2skill/jobs/:id/gate1/answer    → gate 1 answers
 *   POST /book2skill/jobs/:id/gate2/decision  → pass / regenerate (+edited draft)
 *   POST /book2skill/jobs/:id/gate3/targets   → target selection
 *   POST /book2skill/jobs/:id/gate3/confirm   → confirm targets (gate 3)
 *   GET  /book2skill/picker/list?path=        → directory listing (browse capability)
 *   POST /book2skill/zlib/search              → z-lib search
 *   POST /book2skill/zlib/download            → z-lib download into job
 *   GET  /book2skill/assets/:name             → bundled SVG assets
 *
 * All handlers are loopback-guarded (the Host header must be loopback).
 * @module @dsh-external/dsh-book2skill/routes
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url));
const MAX_BODY_BYTES = 1024 * 1024;
const ASSET_NAMES = new Set([
    'plugin-icon.svg', 'banner.svg', 'stage-fetch.svg', 'stage-parse.svg', 'stage-understand.svg',
    'stage-generate.svg', 'stage-install.svg', 'empty-state.svg', 'celebrate.svg',
]);
export function registerBook2SkillRoutes(service) {
    const handler = (req, res) => {
        try {
            if (!isLoopback(req.headers.host)) {
                res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('forbidden');
                return;
            }
            return handle(service, req, res);
        }
        catch (error) {
            fail(res, 500, 'internal', error instanceof Error ? error.message : String(error));
        }
    };
    return service.ctx.webServer.register({ kind: 'prefix', path: '/book2skill', handler });
}
/** Same posture as the connection carrier's /api fence, cheap for a plugin. */
function isLoopback(host) {
    if (host === undefined)
        return true;
    const hostname = host.split(':')[0] ?? '';
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]';
}
function sendJson(res, status, value) {
    const body = JSON.stringify(value);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-store',
    });
    res.end(body);
}
function fail(res, status, code, message) {
    sendJson(res, status, { ok: false, code, message });
}
async function readBody(req) {
    const chunks = [];
    let size = 0;
    await new Promise((resolve, reject) => {
        req.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('请求体过大'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', resolve);
        req.on('error', reject);
    });
    if (chunks.length === 0)
        return undefined;
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        throw new Error('请求体不是合法 JSON');
    }
}
async function handle(service, req, res) {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;
    const method = req.method ?? 'GET';
    if (path === '/book2skill/assets/') {
        res.writeHead(404);
        res.end();
        return;
    }
    // --- assets -----------------------------------------------------------
    if (path.startsWith('/book2skill/assets/')) {
        const name = path.slice('/book2skill/assets/'.length);
        if (!ASSET_NAMES.has(name) || !existsSync(join(ASSETS_DIR, name))) {
            res.writeHead(404);
            res.end();
            return;
        }
        const body = readFileSync(join(ASSETS_DIR, name));
        res.writeHead(200, { 'content-type': 'image/svg+xml', 'content-length': String(body.length), 'cache-control': 'public, max-age=3600' });
        res.end(body);
        return;
    }
    // --- jobs -------------------------------------------------------------
    if (path === '/book2skill/jobs' && method === 'GET') {
        sendJson(res, 200, { ok: true, jobs: await service.listJobs() });
        return;
    }
    if (path === '/book2skill/jobs' && method === 'POST') {
        const body = await readBody(req);
        const input = (body ?? {});
        if (typeof input.bookPath !== 'string' || input.bookPath.trim() === '') {
            if (typeof input.title !== 'string' || input.title.trim() === '') {
                fail(res, 400, 'missing-input', '需要 bookPath（本地书籍绝对路径）或 title（先建任务再 z-lib 下载）');
                return;
            }
        }
        try {
            const job = await service.startJob({ bookPath: input.bookPath, title: input.title });
            sendJson(res, 200, { ok: true, job: service.describeJob(job) });
        }
        catch (error) {
            fail(res, 400, 'start-failed', error instanceof Error ? error.message : String(error));
        }
        return;
    }
    const jobMatch = /^\/book2skill\/jobs\/([^/]+)(\/[^/]*)?$/.exec(path);
    if (jobMatch !== null) {
        const jobId = decodeURIComponent(jobMatch[1]);
        const action = jobMatch[2];
        if (action === undefined && method === 'GET') {
            try {
                const job = await service.getJob(jobId);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 404, 'unknown-job', error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (action === '/cancel' && method === 'POST') {
            try {
                const job = await service.cancel(jobId);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 400, 'cancel-failed', error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (action === '/gate1/answer' && method === 'POST') {
            const body = (await readBody(req));
            if (!Array.isArray(body?.answers) || body.answers.length === 0) {
                fail(res, 400, 'missing-answers', '需要 answers（门控1作答数组）');
                return;
            }
            try {
                const job = await service.answerGate1(jobId, body.answers);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 400, 'gate1-failed', error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (action === '/draft' && method === 'POST') {
            const body = (await readBody(req));
            if (typeof body?.draft !== 'string' || body.draft.trim() === '') {
                fail(res, 400, 'missing-draft', '需要 draft（SKILL.md 草稿全文）');
                return;
            }
            try {
                const job = await service.saveDraft(jobId, body.draft);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 400, 'draft-failed', error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (action === '/gate2/decision' && method === 'POST') {
            const body = (await readBody(req));
            if (body?.verdict !== 'pass' && body?.verdict !== 'regenerate') {
                fail(res, 400, 'missing-verdict', '需要 verdict（pass 或 regenerate）');
                return;
            }
            try {
                const job = await service.decideGate2(jobId, body.verdict, body.draft);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 400, 'gate2-failed', error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (action === '/gate3/targets' && method === 'POST') {
            const body = (await readBody(req));
            if (!Array.isArray(body?.targets)) {
                fail(res, 400, 'missing-targets', '需要 targets（安装目标数组）');
                return;
            }
            try {
                const job = await service.setTargets(jobId, body.targets);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 400, 'targets-failed', error instanceof Error ? error.message : String(error));
            }
            return;
        }
        if (action === '/gate3/confirm' && method === 'POST') {
            try {
                const job = await service.confirmInstall(jobId);
                sendJson(res, 200, { ok: true, job: service.describeJob(job) });
            }
            catch (error) {
                fail(res, 400, 'confirm-failed', error instanceof Error ? error.message : String(error));
            }
            return;
        }
    }
    // --- directory picker (browse capability) ------------------------------
    if (path === '/book2skill/picker/list' && method === 'GET') {
        const capability = service.ctx.directoryPicker.capability();
        if (capability.kind !== 'browse' || capability.list === undefined) {
            fail(res, 400, 'picker-unavailable', '当前部署不提供目录浏览能力，请直接在路径框输入绝对路径');
            return;
        }
        const requestPath = url.searchParams.get('path') ?? undefined;
        try {
            const listing = await capability.list(requestPath);
            sendJson(res, 200, { ok: true, listing });
        }
        catch (error) {
            fail(res, 400, 'list-failed', error instanceof Error ? error.message : String(error));
        }
        return;
    }
    // --- z-lib -------------------------------------------------------------
    if (path === '/book2skill/zlib/search' && method === 'POST') {
        const body = (await readBody(req));
        if (typeof body?.query !== 'string' || body.query.trim() === '') {
            fail(res, 400, 'missing-query', '需要 query（搜索关键词）');
            return;
        }
        sendJson(res, 200, await service.zlibSearch(body.query));
        return;
    }
    if (path === '/book2skill/zlib/download' && method === 'POST') {
        const body = (await readBody(req));
        if (typeof body?.jobId !== 'string' || typeof body?.downloadPath !== 'string') {
            fail(res, 400, 'missing-fields', '需要 jobId 与 downloadPath');
            return;
        }
        try {
            const job = await service.zlibDownload(body.jobId, body.downloadPath);
            sendJson(res, 200, { ok: true, job: service.describeJob(job) });
        }
        catch (error) {
            fail(res, 400, 'download-failed', error instanceof Error ? error.message : String(error));
        }
        return;
    }
    fail(res, 404, 'not-found', `未知端点：${method} ${path}`);
}
