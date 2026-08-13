import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Book2SkillPanel — the 5-stage timeline view registered as a
 * conversation.view tab. Data comes from the host /book2skill routes; the
 * panel never fabricates progress — gates wait on the human while the
 * agent polls job state through its tools.
 * @module
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from "./rpc.js";
import styles from './Book2SkillPanel.module.css';
const STAGE_DEFS = [
    { id: 1, label: '获取书籍', icon: '/book2skill/assets/stage-fetch.svg' },
    { id: 2, label: '解析分章', icon: '/book2skill/assets/stage-parse.svg' },
    { id: 3, label: '深度阅读', icon: '/book2skill/assets/stage-understand.svg' },
    { id: 4, label: '生成 SKILL.md', icon: '/book2skill/assets/stage-generate.svg' },
    { id: 5, label: '安装', icon: '/book2skill/assets/stage-install.svg' },
];
const ACTIVE_STATUSES = new Set(['pending', 'fetching', 'parsing', 'reading', 'awaiting_gate1', 'deep_reading', 'drafting', 'awaiting_gate2', 'installing', 'awaiting_gate3']);
const POLL_MS = 1200;
export function Book2SkillPanel() {
    const [jobs, setJobs] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [job, setJob] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    const refreshJobs = useCallback(async () => {
        try {
            const result = await api.listJobs();
            if (!mounted.current)
                return;
            setJobs(result.jobs);
            setError(null);
        }
        catch (err) {
            if (mounted.current)
                setError(err instanceof Error ? err.message : String(err));
        }
    }, []);
    useEffect(() => {
        void refreshJobs();
    }, [refreshJobs]);
    const refreshJob = useCallback(async (jobId) => {
        try {
            const result = await api.getJob(jobId);
            if (!mounted.current)
                return;
            setJob(result.job);
            setError(null);
        }
        catch (err) {
            if (mounted.current)
                setError(err instanceof Error ? err.message : String(err));
        }
    }, []);
    // Poll while the selected job is in an active status; gates included so
    // the panel wakes up when the agent posts questions/drafts.
    useEffect(() => {
        if (selectedId === null)
            return;
        void refreshJob(selectedId);
        const timer = setInterval(() => {
            if (selectedId === null)
                return;
            void refreshJob(selectedId).then(() => {
                void refreshJobs();
            });
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [selectedId, refreshJob, refreshJobs]);
    const select = (jobId) => {
        setSelectedId(jobId);
        setJob(null);
    };
    const applyJob = (next) => {
        setJob(next);
        setSelectedId(next.id);
        void refreshJobs();
    };
    const run = async (fn) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: styles.panel, children: [_jsxs("header", { className: styles.header, children: [_jsx("img", { className: styles.banner, src: "/book2skill/assets/banner.svg", alt: "\u4E66\u7C4D \u2192 \u7AE0\u8282 \u2192 \u6280\u80FD\u5361" }), _jsxs("div", { className: styles.headerRow, children: [_jsx("h2", { className: styles.title, children: "\u4E66\u7C4D\u8F6C\u6280\u80FD" }), _jsx("span", { className: styles.subtitle, children: "EPUB/PDF \u2192 5 \u9636\u6BB5 \u2192 \u53EF\u5B89\u88C5 skill\uFF083 \u4E2A\u4EBA\u7C7B\u95E8\u63A7\uFF09" })] })] }), error !== null && _jsx("div", { className: styles.error, role: "alert", children: error }), _jsxs("div", { className: styles.body, children: [_jsxs("aside", { className: styles.sidebar, children: [_jsx(NewJobForm, { onCreated: applyJob, busy: busy, onBusy: setBusy, setError: setError }), _jsx("div", { className: styles.sideTitle, children: "\u4EFB\u52A1" }), jobs.length === 0 && (_jsxs("div", { className: styles.empty, children: [_jsx("img", { src: "/book2skill/assets/empty-state.svg", alt: "\u6682\u65E0\u4EFB\u52A1" }), _jsx("p", { children: "\u8FD8\u6CA1\u6709\u4EFB\u52A1\u3002\u5DE6\u4FA7\u8F93\u5165\u672C\u5730\u4E66\u7C4D\u8DEF\u5F84\uFF08EPUB/PDF\uFF09\uFF0C\u6216\u4ECE z-lib \u641C\u7D22\u4E0B\u8F7D\u3002" })] })), jobs.map(row => (_jsxs("button", { className: row.id === selectedId ? styles.jobRowActive : styles.jobRow, onClick: () => select(row.id), children: [_jsx("span", { className: styles.jobTitle, children: row.title }), _jsxs("span", { className: styles.jobMeta, children: [statusLabel(row.status), " \u00B7 \u9636\u6BB5", row.stage] })] }, row.id)))] }), _jsx("main", { className: styles.main, children: job === null ? (_jsx("div", { className: styles.placeholder, children: "\u2190 \u9009\u62E9\u5DE6\u4FA7\u4EFB\u52A1\u67E5\u770B 5 \u9636\u6BB5\u8FDB\u5EA6\u4E0E\u95E8\u63A7" })) : (_jsxs(_Fragment, { children: [_jsx(JobHeader, { job: job, onCancel: () => run(async () => {
                                        const result = await api.cancel(job.id);
                                        applyJob(result.job);
                                    }), busy: busy }), _jsx(Timeline, { stage: job.stage, status: job.status }), _jsx(StageBody, { job: job, onApply: applyJob, busy: busy, run: run })] })) })] })] }));
}
function statusLabel(status) {
    const map = {
        pending: '待解析', fetching: '下载中', parsing: '解析中', parsed: '已解析',
        reading: '浅读中', awaiting_gate1: '门控1：等待作答', deep_reading: '深读中',
        drafting: '起草中', awaiting_gate2: '门控2：等待审批', installing: '安装中',
        awaiting_gate3: '门控3：确认目标', installed: '已安装', cancelled: '已取消', failed: '失败',
    };
    return map[status] ?? status;
}
function JobHeader(props) {
    const { job } = props;
    return (_jsxs("div", { className: styles.jobHeader, children: [_jsxs("div", { children: [_jsx("div", { className: styles.jobName, children: job.title ?? job.id }), _jsx("div", { className: styles.jobStatus, children: statusLabel(job.status) }), job.error !== undefined && _jsx("div", { className: styles.jobError, children: job.error })] }), ACTIVE_STATUSES.has(job.status) && (_jsx("button", { className: styles.dangerButton, disabled: props.busy, onClick: props.onCancel, children: "\u53D6\u6D88\u4EFB\u52A1" }))] }));
}
function Timeline(props) {
    const { stage, status } = props;
    const passed = stage > 1 || ['cancelled', 'failed', 'installed'].includes(status);
    return (_jsxs("ol", { className: styles.timeline, children: [STAGE_DEFS.map(def => {
                const done = def.id < stage;
                const active = def.id === stage;
                return (_jsxs("li", { className: done ? styles.stageDone : active ? styles.stageActive : styles.stagePending, children: [_jsx("img", { className: styles.stageIcon, src: def.icon, alt: "" }), _jsx("span", { className: styles.stageLabel, children: def.label }), active && status.startsWith('awaiting_gate') && _jsx("span", { className: styles.gateBadge, children: "\u7B49\u5F85\u4F60" })] }, def.id));
            }), void passed] }));
}
// ── stage 1: fetch ──────────────────────────────────────────────────────
function NewJobForm(props) {
    const [path, setPath] = useState('');
    const [title, setTitle] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [zlibOpen, setZlibOpen] = useState(false);
    const create = async () => {
        if (path.trim() === '' && title.trim() === '')
            return;
        props.onBusy(true);
        try {
            const result = await api.createJob({ bookPath: path.trim() === '' ? undefined : path.trim(), title: title.trim() === '' ? undefined : title.trim() });
            props.onCreated(result.job);
            setPath('');
            setTitle('');
        }
        catch (error) {
            props.setError(error instanceof Error ? error.message : String(error));
        }
        finally {
            props.onBusy(false);
        }
    };
    return (_jsxs("div", { className: styles.newJob, children: [_jsxs("div", { className: styles.field, children: [_jsx("label", { className: styles.fieldLabel, children: "\u672C\u5730\u4E66\u7C4D\u8DEF\u5F84\uFF08EPUB / PDF\uFF09" }), _jsxs("div", { className: styles.pathRow, children: [_jsx("input", { className: styles.input, value: path, placeholder: "/home/you/books/\u67D0\u4E66.epub", onChange: event => setPath(event.target.value) }), _jsx("button", { className: styles.secondaryButton, onClick: () => setPickerOpen(true), children: "\u6D4F\u89C8\u2026" })] })] }), _jsxs("div", { className: styles.field, children: [_jsx("label", { className: styles.fieldLabel, children: "\u4E66\u540D\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { className: styles.input, value: title, placeholder: "\u7F3A\u7701\u53D6\u6587\u4EF6\u540D", onChange: event => setTitle(event.target.value) })] }), _jsxs("div", { className: styles.formActions, children: [_jsx("button", { className: styles.primaryButton, disabled: props.busy || (path.trim() === '' && title.trim() === ''), onClick: () => void create(), children: "\u521B\u5EFA\u4EFB\u52A1" }), _jsx("button", { className: styles.secondaryButton, onClick: () => setZlibOpen(open => !open), children: zlibOpen ? '收起 z-lib' : 'z-lib 搜索下载' })] }), zlibOpen && _jsx(ZlibSearch, { onCreate: props.onCreated, onBusy: props.onBusy, setError: props.setError }), pickerOpen && _jsx(PickerModal, { path: path, onClose: () => setPickerOpen(false), onPick: picked => { setPath(picked); setPickerOpen(false); } })] }));
}
function PickerModal(props) {
    const [current, setCurrent] = useState(props.path === '' ? undefined : props.path);
    const [listing, setListing] = useState(null);
    const [error, setError] = useState(null);
    const load = useCallback(async (path) => {
        try {
            const result = await api.pickerList(path);
            setListing(result);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, []);
    useEffect(() => {
        void load(current);
    }, [current, load]);
    const dirs = listing === null ? [] : listing.listing.entries.filter(entry => !entry.hidden);
    return (_jsx("div", { className: styles.modalBackdrop, onClick: props.onClose, children: _jsxs("div", { className: styles.modal, onClick: event => event.stopPropagation(), children: [_jsx("div", { className: styles.modalTitle, children: "\u9009\u62E9\u4E66\u7C4D\u76EE\u5F55" }), error !== null && _jsx("div", { className: styles.error, children: error }), _jsx("div", { className: styles.crumbs, children: listing?.listing.crumbs.map(crumb => (_jsxs("button", { className: styles.crumb, onClick: () => setCurrent(crumb.path), children: [crumb.name, "/"] }, crumb.path))) }), _jsx("ul", { className: styles.dirList, children: dirs.map(entry => (_jsx("li", { children: _jsxs("button", { className: styles.dirEntry, onClick: () => setCurrent(entry.path), children: ["\uD83D\uDCC1 ", entry.name] }) }, entry.path))) }), _jsxs("div", { className: styles.modalActions, children: [_jsx("button", { className: styles.primaryButton, disabled: listing === null, onClick: () => { if (listing !== null)
                                props.onPick(listing.listing.path); }, children: "\u9009\u62E9\u6B64\u76EE\u5F55" }), _jsx("button", { className: styles.secondaryButton, onClick: props.onClose, children: "\u53D6\u6D88" })] })] }) }));
}
function ZlibSearch(props) {
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState(null);
    const [needAuth, setNeedAuth] = useState(null);
    const [selected, setSelected] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const search = async () => {
        if (query.trim() === '')
            return;
        try {
            const result = await api.zlibSearch(query.trim());
            if (result.needAuth === true) {
                setNeedAuth(result.hint ?? '需要登录');
                setRows(null);
            }
            else {
                setRows(result.rows ?? []);
                setNeedAuth(null);
                setSelected(null);
            }
            props.setError(null);
        }
        catch (error) {
            props.setError(error instanceof Error ? error.message : String(error));
        }
    };
    const download = async () => {
        if (rows === null || selected === null)
            return;
        const row = rows[selected];
        setDownloading(true);
        props.onBusy(true);
        try {
            // 先建任务（标题取自选中的书），再把下载内容挂进去
            const created = await api.createJob({ title: row.title });
            const result = await api.zlibDownload(created.job.id, row.download);
            props.onCreate(result.job);
        }
        catch (error) {
            props.setError(error instanceof Error ? error.message : String(error));
        }
        finally {
            setDownloading(false);
            props.onBusy(false);
        }
    };
    return (_jsxs("div", { className: styles.zlib, children: [_jsxs("div", { className: styles.pathRow, children: [_jsx("input", { className: styles.input, value: query, placeholder: "\u4E66\u540D / \u4F5C\u8005 / ISBN", onChange: event => setQuery(event.target.value) }), _jsx("button", { className: styles.primaryButton, onClick: () => void search(), children: "\u641C\u7D22" })] }), needAuth !== null && _jsx("div", { className: styles.warning, children: needAuth }), rows !== null && rows.length === 0 && _jsx("div", { className: styles.warning, children: "\u65E0\u7ED3\u679C\uFF0C\u8BF7\u6362\u5173\u952E\u8BCD\uFF08\u82F1\u6587\u4E66\u540D / \u4F5C\u8005\u540D\uFF09\u3002" }), rows !== null && rows.length > 0 && (_jsx("ul", { className: styles.zlibList, children: rows.map((row, index) => (_jsx("li", { className: styles.zlibRow, children: _jsxs("label", { className: styles.zlibLabel, children: [_jsx("input", { type: "radio", name: "zlib-row", checked: selected === index, onChange: () => setSelected(index) }), _jsxs("span", { className: styles.zlibInfo, children: [_jsx("span", { className: styles.zlibTitle, children: row.title }), _jsxs("span", { className: styles.zlibMeta, children: [row.author, " (", row.year, ") \u00B7 ", row.extension, " \u00B7 ", row.filesize] })] })] }) }, `${row.download}-${index}`))) })), rows !== null && rows.length > 0 && (_jsx("button", { className: styles.primaryButton, disabled: selected === null || downloading, onClick: () => void download(), children: downloading ? '下载中…' : '下载并创建任务' }))] }));
}
// ── stage bodies ────────────────────────────────────────────────────────
function StageBody(props) {
    const { job } = props;
    if (job.status === 'cancelled')
        return _jsx("div", { className: styles.note, children: "\u4EFB\u52A1\u5DF2\u53D6\u6D88\u3002" });
    if (job.status === 'failed')
        return _jsxs("div", { className: styles.note, children: ["\u4EFB\u52A1\u5931\u8D25\uFF1A", job.error ?? '未知错误'] });
    switch (job.stage) {
        case 1: return _jsx(Stage1, { job: job });
        case 2: return _jsx(Stage2, { job: job });
        case 3: return _jsx(Stage3, { job: job, onApply: props.onApply, busy: props.busy, run: props.run });
        case 4: return _jsx(Stage4, { job: job, onApply: props.onApply, busy: props.busy, run: props.run });
        case 5: return _jsx(Stage5, { job: job, onApply: props.onApply, busy: props.busy, run: props.run });
        default: return null;
    }
}
function Stage1(props) {
    const { job } = props;
    return (_jsx("div", { className: styles.stageBody, children: _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardTitle, children: "\u83B7\u53D6\u4E66\u7C4D" }), job.book.path !== undefined
                    ? _jsxs("p", { children: [job.book.path, "\uFF08", job.book.format ?? '未解析', "\uFF09"] })
                    : _jsx("p", { children: "\u4E66\u7C4D\u5C1A\u672A\u5C31\u4F4D\uFF1A\u5728\u5DE6\u4FA7\u8F93\u5165\u672C\u5730\u8DEF\u5F84\uFF0C\u6216 z-lib \u641C\u7D22\u4E0B\u8F7D\uFF1B\u4E5F\u53EF\u8BA9 agent \u7528 book2skill_start \u5DE5\u5177\u76F4\u63A5\u521B\u5EFA\u3002" }), job.status === 'pending' && _jsx("p", { className: styles.hint, children: "\u4E0B\u4E00\u6B65\uFF1A\u89E3\u6790\u5206\u7AE0\uFF08agent \u8C03\u7528 book2skill_parse\uFF0C\u6216\u5728\u5BF9\u8BDD\u4E2D\u8BF4\u201C\u89E3\u6790\u201D\uFF09" })] }) }));
}
function Stage2(props) {
    const { job } = props;
    const ocr = job.ocr;
    return (_jsx("div", { className: styles.stageBody, children: _jsxs("div", { className: styles.card, children: [_jsxs("div", { className: styles.cardTitle, children: ["\u89E3\u6790\u5206\u7AE0", job.chapters.length > 0 && _jsxs("span", { className: styles.badge, children: [job.chapters.length, " \u7AE0"] })] }), job.status === 'parsing' && ocr === null && _jsx("p", { className: styles.hint, children: "\u89E3\u6790\u4E2D\u2026\uFF08EPUB/\u6587\u672C\u578B PDF \u5F88\u5FEB\uFF09" }), ocr !== null && ocr.state !== 'done' && ocr.state !== 'idle' && (_jsxs("div", { className: styles.ocr, children: [_jsx("div", { className: styles.ocrRow, children: _jsx("span", { children: ocr.queued === true ? '排队中' : ocr.state === 'error' ? 'OCR 出错' : `OCR 逐页识别 ${ocr.page}/${ocr.total}` }) }), ocr.state !== 'error' && (_jsx("div", { className: styles.progressTrack, children: _jsx("div", { className: styles.progressFill, style: { width: `${ocr.total === 0 ? 0 : Math.min(100, (ocr.page / ocr.total) * 100)}%` } }) })), ocr.message !== undefined && _jsx("p", { className: styles.hint, children: ocr.message })] })), job.chapters.length > 0 && (_jsx("ul", { className: styles.chapterTree, children: job.chapters.map(chapter => (_jsxs("li", { children: [_jsx("span", { className: styles.chapterName, children: chapter.title }), _jsxs("span", { className: styles.chapterChars, children: [chapter.chars, " \u5B57"] })] }, chapter.file))) })), job.status === 'parsed' && _jsx("p", { className: styles.hint, children: "\u89E3\u6790\u5B8C\u6210\u3002\u4E0B\u4E00\u6B65\uFF1Aagent \u6D45\u8BFB\u5EFA\u5730\u56FE\uFF0C\u5E76\u8BBE\u8BA1 \u22643 \u4E2A\u65B9\u5411\u95EE\u9898\uFF08\u95E8\u63A71\uFF09\u3002" })] }) }));
}
function Stage3(props) {
    const { job } = props;
    const summary = job.notes.findLast(note => note.kind === 'summary');
    const [draft, setDraft] = useState({});
    useEffect(() => {
        const seed = {};
        for (const answer of job.gate1.answers ?? [])
            seed[answer.id] = answer;
        setDraft(seed);
    }, [job.gate1.answers]);
    const submit = () => {
        if (job.gate1.status !== 'open')
            return;
        const answers = job.gate1.questions.map(question => draft[question.id]).filter((answer) => answer !== undefined);
        if (answers.length !== job.gate1.questions.length)
            return;
        void props.run(async () => {
            const result = await api.answerGate1(job.id, answers);
            props.onApply(result.job);
        });
    };
    return (_jsxs("div", { className: styles.stageBody, children: [_jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardTitle, children: "\u6D45\u8BFB\u6458\u8981" }), summary !== undefined
                        ? _jsx("pre", { className: styles.pre, children: summary.text })
                        : _jsx("p", { className: styles.hint, children: "agent \u6B63\u5728\u6D45\u8BFB\u5EFA\u7ACB\u5730\u56FE\u2026\uFF08\u5B8C\u6210\u540E\u8FD9\u91CC\u663E\u793A\u6838\u5FC3\u65B9\u6CD5\u8BBA / \u53EF\u64CD\u4F5C\u7AE0\u8282 / \u6848\u4F8B\u5206\u5E03\uFF09" })] }), _jsxs("div", { className: styles.card, children: [_jsxs("div", { className: styles.cardTitle, children: ["\u95E8\u63A71 \u00B7 \u9605\u8BFB\u65B9\u5411\u786E\u8BA4 ", job.gate1.status === 'open' && _jsx("span", { className: styles.gateBadge, children: "\u7B49\u5F85\u4F60" })] }), job.gate1.status === 'closed' && _jsx("p", { className: styles.hint, children: "agent \u6D45\u8BFB\u540E\u5C06\u5728\u8FD9\u91CC\u7ED9\u51FA \u22643 \u4E2A\u9009\u62E9\u9898\u3002" }), job.gate1.questions.map(question => (_jsxs("div", { className: styles.question, children: [_jsx("div", { className: styles.questionText, children: question.question }), question.detail !== undefined && _jsx("div", { className: styles.questionDetail, children: question.detail }), question.options.map(option => {
                                const answer = draft[question.id];
                                const checked = answer?.selected.includes(option.label) === true;
                                return (_jsxs("label", { className: styles.option, children: [_jsx("input", { type: question.multiSelect === true ? 'checkbox' : 'radio', name: question.id, checked: checked, onChange: () => {
                                                const previous = draft[question.id]?.selected ?? [];
                                                const next = question.multiSelect === true
                                                    ? checked ? previous.filter(label => label !== option.label) : [...previous, option.label]
                                                    : [option.label];
                                                setDraft(current => ({ ...current, [question.id]: { id: question.id, selected: next, custom: draft[question.id]?.custom } }));
                                            } }), _jsxs("span", { children: [_jsx("span", { className: styles.optionLabel, children: option.label }), option.context !== '' && _jsx("span", { className: styles.optionContext, children: option.context })] })] }, option.label));
                            }), _jsx("input", { className: styles.input, placeholder: "\u5176\u4ED6\u56DE\u7B54\uFF08\u53EF\u9009\uFF0C\u81EA\u5B9A\u4E49\u7B54\u6848\uFF09", value: draft[question.id]?.custom ?? '', onChange: event => setDraft(current => ({ ...current, [question.id]: { id: question.id, selected: current[question.id]?.selected ?? [], custom: event.target.value } })) })] }, question.id))), job.gate1.status === 'open' && (_jsx("button", { className: styles.primaryButton, disabled: props.busy, onClick: submit, children: "\u63D0\u4EA4\u5E76\u7EE7\u7EED" })), job.gate1.status === 'answered' && _jsx("p", { className: styles.hint, children: "\u5DF2\u4F5C\u7B54\u3002agent \u5C06\u6309\u4F60\u7684\u65B9\u5411\u6DF1\u8BFB 3-5 \u4E2A\u6838\u5FC3\u7AE0\u8282\u3002\u5728\u5BF9\u8BDD\u4E2D\u7EE7\u7EED\u5373\u53EF\u3002" })] })] }));
}
function Stage4(props) {
    const { job } = props;
    const [draft, setDraft] = useState(job.skill.draft ?? '');
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        setDraft(job.skill.draft ?? '');
        setDirty(false);
    }, [job.skill.draft]);
    const map = job.notes.findLast(note => note.kind === 'knowledge-map');
    const checks = job.skill.selfcheck;
    const allPass = checks.length === 3 && checks.every(check => check.pass);
    return (_jsxs("div", { className: styles.stageBody, children: [map !== undefined && (_jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardTitle, children: "\u77E5\u8BC6\u5730\u56FE" }), _jsx("pre", { className: styles.pre, children: map.text })] })), _jsxs("div", { className: styles.card, children: [_jsxs("div", { className: styles.cardTitle, children: ["SKILL.md \u8349\u7A3F\uFF08\u53EF\u7F16\u8F91\uFF09 ", job.gate2.status === 'open' && _jsx("span", { className: styles.gateBadge, children: "\u7B49\u5F85\u4F60" })] }), _jsx("textarea", { className: styles.textarea, value: draft, onChange: event => { setDraft(event.target.value); setDirty(true); }, spellCheck: false }), dirty && (_jsxs("div", { className: styles.formActions, children: [_jsx("button", { className: styles.secondaryButton, disabled: props.busy, onClick: () => void props.run(async () => {
                                    const result = await api.saveDraft(job.id, draft);
                                    props.onApply(result.job);
                                }), children: "\u4FDD\u5B58\u4FEE\u6539" }), _jsx("button", { className: styles.linkButton, onClick: () => setDraft(job.skill.draft ?? ''), children: "\u653E\u5F03\u4FEE\u6539" })] }))] }), _jsxs("div", { className: styles.card, children: [_jsx("div", { className: styles.cardTitle, children: "3 \u9879\u81EA\u68C0\u6E05\u5355" }), checks.length === 0 && _jsx("p", { className: styles.hint, children: "agent \u751F\u6210\u8349\u7A3F\u540E\u4F1A\u9010\u9879\u81EA\u68C0\uFF1ASOP \u53EF\u6EAF\u6E90 / \u7D22\u5F15\u51C6\u786E / \u89E6\u53D1\u8BCD\u5BBD\u7A84\u3002" }), checks.map(check => (_jsxs("div", { className: check.pass ? styles.checkPass : styles.checkFail, children: [_jsx("span", { className: styles.checkMark, children: check.pass ? '✓' : '✗' }), _jsx("span", { className: styles.checkTitle, children: check.title }), _jsx("span", { className: styles.checkNote, children: check.note })] }, check.id)))] }), job.gate2.status === 'open' && (_jsxs("div", { className: styles.formActions, children: [_jsx("button", { className: styles.secondaryButton, disabled: props.busy, onClick: () => void props.run(async () => {
                            const result = await api.decideGate2(job.id, 'regenerate', dirty ? draft : undefined);
                            props.onApply(result.job);
                        }), children: "\u91CD\u65B0\u751F\u6210" }), _jsx("button", { className: styles.primaryButton, disabled: props.busy, onClick: () => void props.run(async () => {
                            const result = await api.decideGate2(job.id, 'pass', dirty ? draft : undefined);
                            props.onApply(result.job);
                        }), children: "\u901A\u8FC7\u5E76\u7EE7\u7EED" }), !allPass && _jsx("span", { className: styles.hint, children: "\u5B58\u5728\u672A\u901A\u8FC7\u7684\u81EA\u68C0\u9879\uFF1B\u70B9\u201C\u91CD\u65B0\u751F\u6210\u201D\u4F1A\u8BA9 agent \u4FEE\u590D\uFF0C\u6216\u76F4\u63A5\u901A\u8FC7\u3002" })] })), job.gate2.status === 'decided' && job.gate2.verdict === 'regenerate' && _jsx("p", { className: styles.hint, children: "\u5DF2\u8981\u6C42 agent \u91CD\u65B0\u751F\u6210\u3002\u5728\u5BF9\u8BDD\u4E2D\u7EE7\u7EED\u5373\u53EF\u3002" })] }));
}
function Stage5(props) {
    const { job } = props;
    const labels = job.targetLabels ?? { claude: '~/.claude/skills', codex: '~/.codex/skills', kk_skill: '~/kk_skill/skills' };
    const [targets, setTargets] = useState(job.install.targets);
    useEffect(() => {
        setTargets(job.install.targets);
    }, [job.install.targets]);
    const toggle = (target) => {
        const next = targets.includes(target) ? targets.filter(item => item !== target) : [...targets, target];
        setTargets(next);
        void api.setTargets(job.id, next).catch(() => { });
    };
    const installed = job.install.result;
    const triggerNote = job.notes.findLast(note => note.title === '触发示例' || note.kind === 'other' && note.title.includes('触发'));
    let chips = [];
    if (triggerNote !== undefined) {
        try {
            const parsed = JSON.parse(triggerNote.text);
            if (Array.isArray(parsed))
                chips = parsed.map(item => String(item));
        }
        catch {
            chips = [];
        }
    }
    if (chips.length === 0)
        chips = [`用《${job.title ?? '这本书'}》的方法帮我分析…`, job.skill.name ?? ''].filter(chip => chip !== '');
    return (_jsx("div", { className: styles.stageBody, children: installed === undefined ? (_jsx(_Fragment, { children: _jsxs("div", { className: styles.card, children: [_jsxs("div", { className: styles.cardTitle, children: ["\u95E8\u63A73 \u00B7 \u5B89\u88C5\u76EE\u6807\uFF08\u591A\u9009\uFF09 ", job.status === 'awaiting_gate3' && _jsx("span", { className: styles.gateBadge, children: "\u7B49\u5F85\u4F60" })] }), ['claude', 'codex', 'kk_skill'].map(target => (_jsxs("label", { className: styles.option, children: [_jsx("input", { type: "checkbox", checked: targets.includes(target), onChange: () => toggle(target) }), _jsxs("span", { children: [_jsx("span", { className: styles.optionLabel, children: labels[target] ?? target }), target === 'kk_skill' && _jsx("span", { className: styles.optionContext, children: "\u5199\u5165 kk_skill \u540C\u6B65\u4ED3\u5E93\uFF08\u6BCF\u5929 05:00 \u6216\u624B\u52A8 sync \u63A8\u9001\uFF09" })] })] }, target))), _jsx("div", { className: styles.formActions, children: _jsx("button", { className: styles.primaryButton, disabled: props.busy || targets.length === 0, onClick: () => void props.run(async () => {
                                const result = await api.confirmInstall(job.id);
                                props.onApply(result.job);
                            }), children: "\u786E\u8BA4\u5B89\u88C5" }) }), _jsx("p", { className: styles.hint, children: "\u786E\u8BA4\u540E agent \u8C03\u7528 book2skill_install \u6267\u884C\u590D\u5236\uFF1B\u76EE\u6807\u76EE\u5F55\u5DF2\u5B58\u5728\u540C\u540D skill \u65F6\u9700\u8981 agent \u8986\u76D6\u786E\u8BA4\u3002" })] }) })) : (_jsxs("div", { className: styles.card, children: [_jsx("img", { className: styles.celebrate, src: "/book2skill/assets/celebrate.svg", alt: "\u5B8C\u6210" }), _jsx("div", { className: styles.cardTitle, children: "\u5B89\u88C5\u5B8C\u6210" }), installed.map(item => (_jsxs("div", { className: item.ok ? styles.checkPass : styles.checkFail, children: [_jsx("span", { className: styles.checkMark, children: item.ok ? '✓' : '✗' }), _jsx("span", { className: styles.checkTitle, children: labels[item.target] ?? item.target }), _jsxs("span", { className: styles.checkNote, children: [item.path, item.error === undefined ? '' : `（${item.error}）`] })] }, item.target))), _jsx("div", { className: styles.cardTitle, children: "\u89E6\u53D1\u793A\u4F8B" }), _jsx("div", { className: styles.chips, children: chips.map(chip => (_jsx("button", { className: styles.chip, onClick: () => { void navigator.clipboard.writeText(chip).then(() => { }); }, title: "\u70B9\u51FB\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C\u7C98\u8D34\u5230\u5BF9\u8BDD\u5373\u53EF\u8BD5\u4E00\u4E0B", children: chip }, chip))) }), _jsx("p", { className: styles.hint, children: "\u7ACB\u5373\u8BD5\u4E00\u4E0B\uFF1A\u590D\u5236\u4EFB\u610F\u89E6\u53D1\u8BED\uFF0C\u7C98\u8D34\u5230\u5BF9\u8BDD\u53D1\u9001\uFF08\u65B0\u4F1A\u8BDD\u6548\u679C\u6700\u4F73\uFF1BClaude Code \u9700 /reload \u751F\u6548\uFF09\u3002" })] })) }));
}
