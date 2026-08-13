/**
 * Panel RPC: plain same-origin fetches against the /book2skill route
 * prefix. Every response is JSON; non-ok bodies still parse and carry a
 * `code`/`message` pair the UI can surface.
 * @module
 */
async function request(path, init) {
    const response = await fetch(path, {
        ...init,
        headers: init?.body === undefined ? { 'content-type': 'application/json' } : { 'content-type': 'application/json' },
    });
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new Error(`面板请求失败：${response.status}`);
    }
    if (!response.ok) {
        const failure = body;
        throw new Error(failure.message ?? `请求失败（HTTP ${response.status}）`);
    }
    return body;
}
export const api = {
    listJobs: () => request('/book2skill/jobs'),
    getJob: (jobId) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}`),
    createJob: (input) => request('/book2skill/jobs', { method: 'POST', body: JSON.stringify(input) }),
    cancel: (jobId) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }),
    saveDraft: (jobId, draft) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/draft`, { method: 'POST', body: JSON.stringify({ draft }) }),
    answerGate1: (jobId, answers) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate1/answer`, { method: 'POST', body: JSON.stringify({ answers }) }),
    decideGate2: (jobId, verdict, draft) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate2/decision`, { method: 'POST', body: JSON.stringify({ verdict, draft }) }),
    setTargets: (jobId, targets) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate3/targets`, { method: 'POST', body: JSON.stringify({ targets }) }),
    confirmInstall: (jobId) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate3/confirm`, { method: 'POST' }),
    pickerList: (path) => request(`/book2skill/picker/list${path === undefined ? '' : `?path=${encodeURIComponent(path)}`}`),
    zlibSearch: (query) => request('/book2skill/zlib/search', { method: 'POST', body: JSON.stringify({ query }) }),
    zlibDownload: (jobId, downloadPath) => request('/book2skill/zlib/download', { method: 'POST', body: JSON.stringify({ jobId, downloadPath }) }),
};
