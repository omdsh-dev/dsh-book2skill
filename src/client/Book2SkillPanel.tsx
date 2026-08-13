/**
 * Book2SkillPanel — the 5-stage timeline view registered as a
 * conversation.view tab. Data comes from the host /book2skill routes; the
 * panel never fabricates progress — gates wait on the human while the
 * agent polls job state through its tools.
 * @module
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { api, type GateAnswerView, type PanelJob, type JobListRow, type ZlibRow } from './rpc.ts'
import styles from './Book2SkillPanel.module.css'

const STAGE_DEFS = [
  { id: 1, label: '获取书籍', icon: '/book2skill/assets/stage-fetch.svg' },
  { id: 2, label: '解析分章', icon: '/book2skill/assets/stage-parse.svg' },
  { id: 3, label: '深度阅读', icon: '/book2skill/assets/stage-understand.svg' },
  { id: 4, label: '生成 SKILL.md', icon: '/book2skill/assets/stage-generate.svg' },
  { id: 5, label: '安装', icon: '/book2skill/assets/stage-install.svg' },
] as const

const ACTIVE_STATUSES = new Set(['pending', 'fetching', 'parsing', 'reading', 'awaiting_gate1', 'deep_reading', 'drafting', 'awaiting_gate2', 'installing', 'awaiting_gate3'])
const POLL_MS = 1200

export function Book2SkillPanel(): ReactElement {
  const [jobs, setJobs] = useState<JobListRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [job, setJob] = useState<PanelJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refreshJobs = useCallback(async (): Promise<void> => {
    try {
      const result = await api.listJobs()
      if (!mounted.current) return
      setJobs(result.jobs)
      setError(null)
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void refreshJobs()
  }, [refreshJobs])

  const refreshJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      const result = await api.getJob(jobId)
      if (!mounted.current) return
      setJob(result.job)
      setError(null)
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  // Poll while the selected job is in an active status; gates included so
  // the panel wakes up when the agent posts questions/drafts.
  useEffect(() => {
    if (selectedId === null) return
    void refreshJob(selectedId)
    const timer = setInterval(() => {
      if (selectedId === null) return
      void refreshJob(selectedId).then(() => {
        void refreshJobs()
      })
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [selectedId, refreshJob, refreshJobs])

  const select = (jobId: string | null): void => {
    setSelectedId(jobId)
    setJob(null)
  }

  const applyJob = (next: PanelJob): void => {
    setJob(next)
    setSelectedId(next.id)
    void refreshJobs()
  }

  const run = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <img className={styles.banner} src="/book2skill/assets/banner.svg" alt="书籍 → 章节 → 技能卡" />
        <div className={styles.headerRow}>
          <h2 className={styles.title}>书籍转技能</h2>
          <span className={styles.subtitle}>EPUB/PDF → 5 阶段 → 可安装 skill（3 个人类门控）</span>
        </div>
      </header>

      {error !== null && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <NewJobForm onCreated={applyJob} busy={busy} onBusy={setBusy} setError={setError} />
          <div className={styles.sideTitle}>任务</div>
          {jobs.length === 0 && (
            <div className={styles.empty}>
              <img src="/book2skill/assets/empty-state.svg" alt="暂无任务" />
              <p>还没有任务。左侧输入本地书籍路径（EPUB/PDF），或从 z-lib 搜索下载。</p>
            </div>
          )}
          {jobs.map(row => (
            <button
              key={row.id}
              className={row.id === selectedId ? styles.jobRowActive : styles.jobRow}
              onClick={() => select(row.id)}
            >
              <span className={styles.jobTitle}>{row.title}</span>
              <span className={styles.jobMeta}>{statusLabel(row.status)} · 阶段{row.stage}</span>
            </button>
          ))}
        </aside>

        <main className={styles.main}>
          {job === null ? (
            <div className={styles.placeholder}>← 选择左侧任务查看 5 阶段进度与门控</div>
          ) : (
            <>
              <JobHeader job={job} onCancel={() => run(async () => {
                const result = await api.cancel(job.id)
                applyJob(result.job)
              })} busy={busy} />
              <Timeline stage={job.stage} status={job.status} />
              <StageBody job={job} onApply={applyJob} busy={busy} run={run} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待解析', fetching: '下载中', parsing: '解析中', parsed: '已解析',
    reading: '浅读中', awaiting_gate1: '门控1：等待作答', deep_reading: '深读中',
    drafting: '起草中', awaiting_gate2: '门控2：等待审批', installing: '安装中',
    awaiting_gate3: '门控3：确认目标', installed: '已安装', cancelled: '已取消', failed: '失败',
  }
  return map[status] ?? status
}

function JobHeader(props: { job: PanelJob; onCancel: () => void; busy: boolean }): ReactElement {
  const { job } = props
  return (
    <div className={styles.jobHeader}>
      <div>
        <div className={styles.jobName}>{job.title ?? job.id}</div>
        <div className={styles.jobStatus}>{statusLabel(job.status)}</div>
        {job.error !== undefined && <div className={styles.jobError}>{job.error}</div>}
      </div>
      {ACTIVE_STATUSES.has(job.status) && (
        <button className={styles.dangerButton} disabled={props.busy} onClick={props.onCancel}>取消任务</button>
      )}
    </div>
  )
}

function Timeline(props: { stage: number; status: string }): ReactElement {
  const { stage, status } = props
  const passed = stage > 1 || ['cancelled', 'failed', 'installed'].includes(status)
  return (
    <ol className={styles.timeline}>
      {STAGE_DEFS.map(def => {
        const done = def.id < stage
        const active = def.id === stage
        return (
          <li key={def.id} className={done ? styles.stageDone : active ? styles.stageActive : styles.stagePending}>
            <img className={styles.stageIcon} src={def.icon} alt="" />
            <span className={styles.stageLabel}>{def.label}</span>
            {active && status.startsWith('awaiting_gate') && <span className={styles.gateBadge}>等待你</span>}
          </li>
        )
      })}
      {void passed}
    </ol>
  )
}

// ── stage 1: fetch ──────────────────────────────────────────────────────

function NewJobForm(props: {
  onCreated: (job: PanelJob) => void
  busy: boolean
  onBusy: (busy: boolean) => void
  setError: (error: string | null) => void
}): ReactElement {
  const [path, setPath] = useState('')
  const [title, setTitle] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [zlibOpen, setZlibOpen] = useState(false)

  const create = async (): Promise<void> => {
    if (path.trim() === '' && title.trim() === '') return
    props.onBusy(true)
    try {
      const result = await api.createJob({ bookPath: path.trim() === '' ? undefined : path.trim(), title: title.trim() === '' ? undefined : title.trim() })
      props.onCreated(result.job)
      setPath('')
      setTitle('')
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error))
    } finally {
      props.onBusy(false)
    }
  }

  return (
    <div className={styles.newJob}>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>本地书籍路径（EPUB / PDF）</label>
        <div className={styles.pathRow}>
          <input
            className={styles.input}
            value={path}
            placeholder="/path/to/books/某书.epub"
            onChange={event => setPath(event.target.value)}
          />
          <button className={styles.secondaryButton} onClick={() => setPickerOpen(true)}>浏览…</button>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>书名（可选）</label>
        <input className={styles.input} value={title} placeholder="缺省取文件名" onChange={event => setTitle(event.target.value)} />
      </div>
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={props.busy || (path.trim() === '' && title.trim() === '')} onClick={() => void create()}>
          创建任务
        </button>
        <button className={styles.secondaryButton} onClick={() => setZlibOpen(open => !open)}>
          {zlibOpen ? '收起 z-lib' : 'z-lib 搜索下载'}
        </button>
      </div>
      {zlibOpen && <ZlibSearch onCreate={props.onCreated} onBusy={props.onBusy} setError={props.setError} />}
      {pickerOpen && <PickerModal path={path} onClose={() => setPickerOpen(false)} onPick={picked => { setPath(picked); setPickerOpen(false) }} />}
    </div>
  )
}

function PickerModal(props: { path: string; onClose: () => void; onPick: (path: string) => void }): ReactElement {
  const [current, setCurrent] = useState<string | undefined>(props.path === '' ? undefined : props.path)
  const [listing, setListing] = useState<{ listing: { path: string; crumbs: Array<{ name: string; path: string }>; entries: Array<{ name: string; path: string; hidden: boolean }> } } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (path?: string): Promise<void> => {
    try {
      const result = await api.pickerList(path)
      setListing(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    void load(current)
  }, [current, load])

  const dirs = listing === null ? [] : listing.listing.entries.filter(entry => !entry.hidden)

  return (
    <div className={styles.modalBackdrop} onClick={props.onClose}>
      <div className={styles.modal} onClick={event => event.stopPropagation()}>
        <div className={styles.modalTitle}>选择书籍目录</div>
        {error !== null && <div className={styles.error}>{error}</div>}
        <div className={styles.crumbs}>
          {listing?.listing.crumbs.map(crumb => (
            <button key={crumb.path} className={styles.crumb} onClick={() => setCurrent(crumb.path)}>{crumb.name}/</button>
          ))}
        </div>
        <ul className={styles.dirList}>
          {dirs.map(entry => (
            <li key={entry.path}>
              <button className={styles.dirEntry} onClick={() => setCurrent(entry.path)}>📁 {entry.name}</button>
            </li>
          ))}
        </ul>
        <div className={styles.modalActions}>
          <button className={styles.primaryButton} disabled={listing === null} onClick={() => { if (listing !== null) props.onPick(listing.listing.path) }}>选择此目录</button>
          <button className={styles.secondaryButton} onClick={props.onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}

function ZlibSearch(props: {
  onCreate: (job: PanelJob) => void
  onBusy: (busy: boolean) => void
  setError: (error: string | null) => void
}): ReactElement {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<ZlibRow[] | null>(null)
  const [needAuth, setNeedAuth] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)

  const search = async (): Promise<void> => {
    if (query.trim() === '') return
    try {
      const result = await api.zlibSearch(query.trim())
      if (result.needAuth === true) {
        setNeedAuth(result.hint ?? '需要登录')
        setRows(null)
      } else {
        setRows(result.rows ?? [])
        setNeedAuth(null)
        setSelected(null)
      }
      props.setError(null)
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error))
    }
  }

  const download = async (): Promise<void> => {
    if (rows === null || selected === null) return
    const row = rows[selected]
    setDownloading(true)
    props.onBusy(true)
    try {
      // 先建任务（标题取自选中的书），再把下载内容挂进去
      const created = await api.createJob({ title: row.title })
      const result = await api.zlibDownload(created.job.id, row.download)
      props.onCreate(result.job)
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error))
    } finally {
      setDownloading(false)
      props.onBusy(false)
    }
  }

  return (
    <div className={styles.zlib}>
      <div className={styles.pathRow}>
        <input className={styles.input} value={query} placeholder="书名 / 作者 / ISBN" onChange={event => setQuery(event.target.value)} />
        <button className={styles.primaryButton} onClick={() => void search()}>搜索</button>
      </div>
      {needAuth !== null && <div className={styles.warning}>{needAuth}</div>}
      {rows !== null && rows.length === 0 && <div className={styles.warning}>无结果，请换关键词（英文书名 / 作者名）。</div>}
      {rows !== null && rows.length > 0 && (
        <ul className={styles.zlibList}>
          {rows.map((row, index) => (
            <li key={`${row.download}-${index}`} className={styles.zlibRow}>
              <label className={styles.zlibLabel}>
                <input type="radio" name="zlib-row" checked={selected === index} onChange={() => setSelected(index)} />
                <span className={styles.zlibInfo}>
                  <span className={styles.zlibTitle}>{row.title}</span>
                  <span className={styles.zlibMeta}>{row.author} ({row.year}) · {row.extension} · {row.filesize}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {rows !== null && rows.length > 0 && (
        <button className={styles.primaryButton} disabled={selected === null || downloading} onClick={() => void download()}>
          {downloading ? '下载中…' : '下载并创建任务'}
        </button>
      )}
    </div>
  )
}

// ── stage bodies ────────────────────────────────────────────────────────

function StageBody(props: { job: PanelJob; onApply: (job: PanelJob) => void; busy: boolean; run: (fn: () => Promise<unknown>) => void }): ReactElement | null {
  const { job } = props
  if (job.status === 'cancelled') return <div className={styles.note}>任务已取消。</div>
  if (job.status === 'failed') return <div className={styles.note}>任务失败：{job.error ?? '未知错误'}</div>

  switch (job.stage) {
    case 1: return <Stage1 job={job} />
    case 2: return <Stage2 job={job} />
    case 3: return <Stage3 job={job} onApply={props.onApply} busy={props.busy} run={props.run} />
    case 4: return <Stage4 job={job} onApply={props.onApply} busy={props.busy} run={props.run} />
    case 5: return <Stage5 job={job} onApply={props.onApply} busy={props.busy} run={props.run} />
    default: return null
  }
}

function Stage1(props: { job: PanelJob }): ReactElement {
  const { job } = props
  return (
    <div className={styles.stageBody}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>获取书籍</div>
        {job.book.path !== undefined
          ? <p>{job.book.path}（{job.book.format ?? '未解析'}）</p>
          : <p>书籍尚未就位：在左侧输入本地路径，或 z-lib 搜索下载；也可让 agent 用 book2skill_start 工具直接创建。</p>}
        {job.status === 'pending' && <p className={styles.hint}>下一步：解析分章（agent 调用 book2skill_parse，或在对话中说“解析”）</p>}
      </div>
    </div>
  )
}

function Stage2(props: { job: PanelJob }): ReactElement {
  const { job } = props
  const ocr = job.ocr
  return (
    <div className={styles.stageBody}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>
          解析分章
          {job.chapters.length > 0 && <span className={styles.badge}>{job.chapters.length} 章</span>}
        </div>
        {job.status === 'parsing' && ocr === null && <p className={styles.hint}>解析中…（EPUB/文本型 PDF 很快）</p>}
        {ocr !== null && ocr.state !== 'done' && ocr.state !== 'idle' && (
          <div className={styles.ocr}>
            <div className={styles.ocrRow}>
              <span>{ocr.queued === true ? '排队中' : ocr.state === 'error' ? 'OCR 出错' : `OCR 逐页识别 ${ocr.page}/${ocr.total}`}</span>
            </div>
            {ocr.state !== 'error' && (
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${ocr.total === 0 ? 0 : Math.min(100, (ocr.page / ocr.total) * 100)}%` }} />
              </div>
            )}
            {ocr.message !== undefined && <p className={styles.hint}>{ocr.message}</p>}
          </div>
        )}
        {job.chapters.length > 0 && (
          <ul className={styles.chapterTree}>
            {job.chapters.map(chapter => (
              <li key={chapter.file}>
                <span className={styles.chapterName}>{chapter.title}</span>
                <span className={styles.chapterChars}>{chapter.chars} 字</span>
              </li>
            ))}
          </ul>
        )}
        {job.status === 'parsed' && <p className={styles.hint}>解析完成。下一步：agent 浅读建地图，并设计 ≤3 个方向问题（门控1）。</p>}
      </div>
    </div>
  )
}

function Stage3(props: { job: PanelJob; onApply: (job: PanelJob) => void; busy: boolean; run: (fn: () => Promise<unknown>) => void }): ReactElement {
  const { job } = props
  const summary = job.notes.findLast(note => note.kind === 'summary')
  const [draft, setDraft] = useState<Record<string, GateAnswerView>>({})

  useEffect(() => {
    const seed: Record<string, GateAnswerView> = {}
    for (const answer of job.gate1.answers ?? []) seed[answer.id] = answer
    setDraft(seed)
  }, [job.gate1.answers])

  const submit = (): void => {
    if (job.gate1.status !== 'open') return
    const answers = job.gate1.questions.map(question => draft[question.id]).filter((answer): answer is GateAnswerView => answer !== undefined)
    if (answers.length !== job.gate1.questions.length) return
    void props.run(async () => {
      const result = await api.answerGate1(job.id, answers)
      props.onApply(result.job)
    })
  }

  return (
    <div className={styles.stageBody}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>浅读摘要</div>
        {summary !== undefined
          ? <pre className={styles.pre}>{summary.text}</pre>
          : <p className={styles.hint}>agent 正在浅读建立地图…（完成后这里显示核心方法论 / 可操作章节 / 案例分布）</p>}
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>门控1 · 阅读方向确认 {job.gate1.status === 'open' && <span className={styles.gateBadge}>等待你</span>}</div>
        {job.gate1.status === 'closed' && <p className={styles.hint}>agent 浅读后将在这里给出 ≤3 个选择题。</p>}
        {job.gate1.questions.map(question => (
          <div key={question.id} className={styles.question}>
            <div className={styles.questionText}>{question.question}</div>
            {question.detail !== undefined && <div className={styles.questionDetail}>{question.detail}</div>}
            {question.options.map(option => {
              const answer = draft[question.id]
              const checked = answer?.selected.includes(option.label) === true
              return (
                <label key={option.label} className={styles.option}>
                  <input
                    type={question.multiSelect === true ? 'checkbox' : 'radio'}
                    name={question.id}
                    checked={checked}
                    onChange={() => {
                      const previous = draft[question.id]?.selected ?? []
                      const next = question.multiSelect === true
                        ? checked ? previous.filter(label => label !== option.label) : [...previous, option.label]
                        : [option.label]
                      setDraft(current => ({ ...current, [question.id]: { id: question.id, selected: next, custom: draft[question.id]?.custom } }))
                    }}
                  />
                  <span>
                    <span className={styles.optionLabel}>{option.label}</span>
                    {option.context !== '' && <span className={styles.optionContext}>{option.context}</span>}
                  </span>
                </label>
              )
            })}
            <input
              className={styles.input}
              placeholder="其他回答（可选，自定义答案）"
              value={draft[question.id]?.custom ?? ''}
              onChange={event => setDraft(current => ({ ...current, [question.id]: { id: question.id, selected: current[question.id]?.selected ?? [], custom: event.target.value } }))}
            />
          </div>
        ))}
        {job.gate1.status === 'open' && (
          <button className={styles.primaryButton} disabled={props.busy} onClick={submit}>提交并继续</button>
        )}
        {job.gate1.status === 'answered' && <p className={styles.hint}>已作答。agent 将按你的方向深读 3-5 个核心章节。在对话中继续即可。</p>}
      </div>
    </div>
  )
}

function Stage4(props: { job: PanelJob; onApply: (job: PanelJob) => void; busy: boolean; run: (fn: () => Promise<unknown>) => void }): ReactElement {
  const { job } = props
  const [draft, setDraft] = useState(job.skill.draft ?? '')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDraft(job.skill.draft ?? '')
    setDirty(false)
  }, [job.skill.draft])

  const map = job.notes.findLast(note => note.kind === 'knowledge-map')
  const checks = job.skill.selfcheck
  const allPass = checks.length === 3 && checks.every(check => check.pass)

  return (
    <div className={styles.stageBody}>
      {map !== undefined && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>知识地图</div>
          <pre className={styles.pre}>{map.text}</pre>
        </div>
      )}
      <div className={styles.card}>
        <div className={styles.cardTitle}>SKILL.md 草稿（可编辑） {job.gate2.status === 'open' && <span className={styles.gateBadge}>等待你</span>}</div>
        <textarea
          className={styles.textarea}
          value={draft}
          onChange={event => { setDraft(event.target.value); setDirty(true) }}
          spellCheck={false}
        />
        {dirty && (
          <div className={styles.formActions}>
            <button className={styles.secondaryButton} disabled={props.busy} onClick={() => void props.run(async () => {
              const result = await api.saveDraft(job.id, draft)
              props.onApply(result.job)
            })}>保存修改</button>
            <button className={styles.linkButton} onClick={() => setDraft(job.skill.draft ?? '')}>放弃修改</button>
          </div>
        )}
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>3 项自检清单</div>
        {checks.length === 0 && <p className={styles.hint}>agent 生成草稿后会逐项自检：SOP 可溯源 / 索引准确 / 触发词宽窄。</p>}
        {checks.map(check => (
          <div key={check.id} className={check.pass ? styles.checkPass : styles.checkFail}>
            <span className={styles.checkMark}>{check.pass ? '✓' : '✗'}</span>
            <span className={styles.checkTitle}>{check.title}</span>
            <span className={styles.checkNote}>{check.note}</span>
          </div>
        ))}
      </div>
      {job.gate2.status === 'open' && (
        <div className={styles.formActions}>
          <button
            className={styles.secondaryButton}
            disabled={props.busy}
            onClick={() => void props.run(async () => {
              const result = await api.decideGate2(job.id, 'regenerate', dirty ? draft : undefined)
              props.onApply(result.job)
            })}
          >重新生成</button>
          <button
            className={styles.primaryButton}
            disabled={props.busy}
            onClick={() => void props.run(async () => {
              const result = await api.decideGate2(job.id, 'pass', dirty ? draft : undefined)
              props.onApply(result.job)
            })}
          >通过并继续</button>
          {!allPass && <span className={styles.hint}>存在未通过的自检项；点“重新生成”会让 agent 修复，或直接通过。</span>}
        </div>
      )}
      {job.gate2.status === 'decided' && job.gate2.verdict === 'regenerate' && <p className={styles.hint}>已要求 agent 重新生成。在对话中继续即可。</p>}
    </div>
  )
}

function Stage5(props: { job: PanelJob; onApply: (job: PanelJob) => void; busy: boolean; run: (fn: () => Promise<unknown>) => void }): ReactElement {
  const { job } = props
  const labels = job.targetLabels ?? { claude: '~/.claude/skills', codex: '~/.codex/skills', kk_skill: '~/kk_skill/skills' }
  const [targets, setTargets] = useState<string[]>(job.install.targets)

  useEffect(() => {
    setTargets(job.install.targets)
  }, [job.install.targets])

  const toggle = (target: string): void => {
    const next = targets.includes(target) ? targets.filter(item => item !== target) : [...targets, target]
    setTargets(next)
    void api.setTargets(job.id, next).catch(() => {})
  }

  const installed = job.install.result
  const triggerNote = job.notes.findLast(note => note.title === '触发示例' || note.kind === 'other' && note.title.includes('触发'))
  let chips: string[] = []
  if (triggerNote !== undefined) {
    try {
      const parsed = JSON.parse(triggerNote.text) as unknown
      if (Array.isArray(parsed)) chips = parsed.map(item => String(item))
    } catch {
      chips = []
    }
  }
  if (chips.length === 0) chips = [`用《${job.title ?? '这本书'}》的方法帮我分析…`, job.skill.name ?? ''].filter(chip => chip !== '')

  return (
    <div className={styles.stageBody}>
      {installed === undefined ? (
        <>
          <div className={styles.card}>
            <div className={styles.cardTitle}>门控3 · 安装目标（多选） {job.status === 'awaiting_gate3' && <span className={styles.gateBadge}>等待你</span>}</div>
            {(['claude', 'codex', 'kk_skill'] as const).map(target => (
              <label key={target} className={styles.option}>
                <input type="checkbox" checked={targets.includes(target)} onChange={() => toggle(target)} />
                <span>
                  <span className={styles.optionLabel}>{labels[target] ?? target}</span>
                  {target === 'kk_skill' && <span className={styles.optionContext}>写入 kk_skill 同步仓库（每天 05:00 或手动 sync 推送）</span>}
                </span>
              </label>
            ))}
            <div className={styles.formActions}>
              <button
                className={styles.primaryButton}
                disabled={props.busy || targets.length === 0}
                onClick={() => void props.run(async () => {
                  const result = await api.confirmInstall(job.id)
                  props.onApply(result.job)
                })}
              >确认安装</button>
            </div>
            <p className={styles.hint}>确认后 agent 调用 book2skill_install 执行复制；目标目录已存在同名 skill 时需要 agent 覆盖确认。</p>
          </div>
        </>
      ) : (
        <div className={styles.card}>
          <img className={styles.celebrate} src="/book2skill/assets/celebrate.svg" alt="完成" />
          <div className={styles.cardTitle}>安装完成</div>
          {installed.map(item => (
            <div key={item.target} className={item.ok ? styles.checkPass : styles.checkFail}>
              <span className={styles.checkMark}>{item.ok ? '✓' : '✗'}</span>
              <span className={styles.checkTitle}>{labels[item.target] ?? item.target}</span>
              <span className={styles.checkNote}>{item.path}{item.error === undefined ? '' : `（${item.error}）`}</span>
            </div>
          ))}
          <div className={styles.cardTitle}>触发示例</div>
          <div className={styles.chips}>
            {chips.map(chip => (
              <button
                key={chip}
                className={styles.chip}
                onClick={() => { void navigator.clipboard.writeText(chip).then(() => {}) }}
                title="点击复制到剪贴板，粘贴到对话即可试一下"
              >
                {chip}
              </button>
            ))}
          </div>
          <p className={styles.hint}>立即试一下：复制任意触发语，粘贴到对话发送（新会话效果最佳；Claude Code 需 /reload 生效）。</p>
        </div>
      )}
    </div>
  )
}
