/**
 * Panel RPC: plain same-origin fetches against the /book2skill route
 * prefix. Every response is JSON; non-ok bodies still parse and carry a
 * `code`/`message` pair the UI can surface.
 * @module
 */

export interface PanelJob {
  id: string
  status: string
  stage: number
  title?: string
  book: { kind: string; path?: string; url?: string; title?: string; format?: string }
  chapters: Array<{ file: string; title: string; chars: number }>
  toc?: string
  ocr: { state: string; page: number; total: number; message?: string; queued?: boolean } | null
  notes: Array<{ kind: string; title: string; text: string; at: string }>
  gate1: { status: string; questions: GateQuestionView[]; answers?: GateAnswerView[] }
  skill: { name?: string; draft?: string; selfcheck: SelfCheckView[] }
  gate2: { status: string; verdict?: 'pass' | 'regenerate' }
  install: { targets: string[]; confirmed?: boolean; result?: InstallResultView[] }
  error?: string
  firstChapter?: { file: string; title: string; chars: number }
  targetLabels: Record<string, string>
  bookPath?: string
}

export interface GateQuestionView {
  id: string
  question: string
  detail?: string
  options: Array<{ label: string; context: string }>
  multiSelect?: boolean
}

export interface GateAnswerView {
  id: string
  selected: string[]
  custom?: string
}

export interface SelfCheckView {
  id: 'traceability' | 'index' | 'triggers'
  title: string
  pass: boolean
  note: string
}

export interface InstallResultView {
  target: string
  path: string
  ok: boolean
  error?: string
}

export interface JobListRow {
  id: string
  status: string
  stage: number
  title: string
  createdAt: string
  updatedAt: string
}

export interface DirectoryListing {
  path: string
  home: string
  crumbs: Array<{ name: string; path: string }>
  entries: Array<{ name: string; path: string; hidden: boolean }>
  truncated: boolean
}

export interface ZlibRow {
  title: string
  author: string
  year: string
  extension: string
  filesize: string
  download: string
  href: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body === undefined ? { 'content-type': 'application/json' } : { 'content-type': 'application/json' },
  })
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error(`面板请求失败：${response.status}`)
  }
  if (!response.ok) {
    const failure = body as { message?: string; code?: string }
    throw new Error(failure.message ?? `请求失败（HTTP ${response.status}）`)
  }
  return body as T
}

export const api = {
  listJobs: () => request<{ ok: true; jobs: JobListRow[] }>('/book2skill/jobs'),
  getJob: (jobId: string) => request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}`),
  createJob: (input: { bookPath?: string; title?: string }) =>
    request<{ ok: true; job: PanelJob }>('/book2skill/jobs', { method: 'POST', body: JSON.stringify(input) }),
  cancel: (jobId: string) =>
    request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }),
  saveDraft: (jobId: string, draft: string) =>
    request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}/draft`, { method: 'POST', body: JSON.stringify({ draft }) }),
  answerGate1: (jobId: string, answers: GateAnswerView[]) =>
    request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate1/answer`, { method: 'POST', body: JSON.stringify({ answers }) }),
  decideGate2: (jobId: string, verdict: 'pass' | 'regenerate', draft?: string) =>
    request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate2/decision`, { method: 'POST', body: JSON.stringify({ verdict, draft }) }),
  setTargets: (jobId: string, targets: string[]) =>
    request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate3/targets`, { method: 'POST', body: JSON.stringify({ targets }) }),
  confirmInstall: (jobId: string) =>
    request<{ ok: true; job: PanelJob }>(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate3/confirm`, { method: 'POST' }),
  pickerList: (path?: string) =>
    request<{ ok: true; listing: DirectoryListing }>(`/book2skill/picker/list${path === undefined ? '' : `?path=${encodeURIComponent(path)}`}`),
  zlibSearch: (query: string) =>
    request<{ ok: boolean; needAuth?: boolean; rows?: ZlibRow[]; error?: string; hint?: string }>('/book2skill/zlib/search', { method: 'POST', body: JSON.stringify({ query }) }),
  zlibDownload: (jobId: string, downloadPath: string) =>
    request<{ ok: true; job: PanelJob }>('/book2skill/zlib/download', { method: 'POST', body: JSON.stringify({ jobId, downloadPath }) }),
}
