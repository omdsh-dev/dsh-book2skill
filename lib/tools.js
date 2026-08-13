/**
 * Agent-facing tools: deterministic steps (parse, install, state) are host
 * tools; understanding and generation stay with the agent. Gate tools
 * return the gate's waiting state instead of fabricating progress.
 * @module @dsh-external/dsh-book2skill/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { INSTALL_TARGET_LABELS, NOTE_KINDS, STAGES } from "./types.js";
const PARSE_TIMEOUT = 30 * 60 * 1000;
/** Tool names (kept in one place for diagnostics + tests). */
export const TOOL_NAMES = [
    'book2skill_start',
    'book2skill_parse',
    'book2skill_get_job',
    'book2skill_stage_note',
    'book2skill_read_chapter',
    'book2skill_zlib_search',
    'book2skill_download',
    'book2skill_import_ocr',
    'book2skill_install',
    'book2skill_cancel',
];
function errorText(error) {
    return error instanceof Error ? error.message : String(error);
}
/** JSON-safe tool result: undefined fields drop, NaN/cycles rejected loudly. */
function toJson(value) {
    return JSON.parse(JSON.stringify(value));
}
/** Render-friendly object view of a JsonValue payload. */
function rec(value) {
    return value;
}
export function registerBook2SkillTools(service) {
    const register = (definition) => service.ctx.tools.register(definition);
    return [
        register(defineTool({
            name: 'book2skill_start',
            description: '创建“书籍转技能”任务：一本本地 EPUB/PDF 或 z-lib 下载链接，产出可安装的 skill。'
                + '创建后按 book2skill_parse → 阅读（门控1）→ 写草稿（门控2）→ book2skill_install（门控3）推进。',
            parameters: {
                bookPath: {
                    type: 'string',
                    description: '本地书籍文件绝对路径（.epub / .pdf）；缺省时需提供 downloadUrl 或 title',
                },
                downloadUrl: {
                    type: 'string',
                    description: 'z-lib 下载路径（形如 /dl/xxxx，来自 book2skill_zlib_search 结果的 download 字段）',
                },
                title: {
                    type: 'string',
                    description: '书名（生成 skill 名称与 references 目录时使用；缺省取文件名）',
                },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderStart(rec(value)) }],
            },
            timeoutMs: 300_000,
            async execute(args) {
                const input = args;
                try {
                    const job = await service.startJob(input);
                    return toJson({ ok: true, jobId: job.id, status: job.status, stage: job.stage, title: job.book.title, hint: startHint(job) });
                }
                catch (error) {
                    return toJson({ ok: false, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_parse',
            description: '解析任务中的书籍：EPUB 走 parse_epub 逻辑（按章 md + toc.md）；文本型 PDF 走 PyPDF2 按 50 页分块；'
                + '扫描型 PDF 自动调 OCR（优先 dsh-paddle-ocr 服务，缺省 HTTP 直调），逐页进度写入任务状态。'
                + '解析完成后 chapters/ 与 toc.md 可用，进入浅读阶段。',
            parameters: {
                jobId: { type: 'string', required: true, description: 'book2skill_start 返回的 jobId' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderParse(rec(value)) }],
            },
            timeoutMs: PARSE_TIMEOUT,
            async execute(args, exec) {
                const { jobId } = args;
                try {
                    const job = await service.parse(jobId, exec.signal);
                    return toJson({ ok: true, jobId, status: job.status, chapters: job.parse.chapters.length, kind: job.parse.kind, toc: job.parse.toc });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_get_job',
            description: '读取“书籍转技能”任务完整状态：阶段、解析结果（章节树/OCR 进度）、笔记（浅读摘要/知识地图/草稿/自检）、'
                + '门控状态与答案。agent 在每一步前先读它判断该做什么；门控等待期间会明确显示等什么。',
            parameters: {
                jobId: { type: 'string', required: true, description: 'book2skill_start 返回的 jobId' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderJob(rec(value)) }],
            },
            async execute(args) {
                const { jobId } = args;
                try {
                    const job = await service.getJob(jobId);
                    return toJson({
                        ok: true, jobId, status: job.status, stage: job.stage,
                        book: job.book,
                        chapters: job.parse.chapters,
                        toc: job.parse.toc,
                        ocr: job.parse.ocr,
                        notes: job.notes,
                        gate1: job.gate1,
                        gate2: job.gate2,
                        install: job.install,
                        error: job.error,
                        next: nextStep(job.status),
                    });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_stage_note',
            description: '记录中间产物并推进任务状态：浅读摘要 / 知识地图 / 深读笔记 / SKILL.md 草稿 / 门控问题 / 自检项。'
                + 'kind=draft：写入草稿并打开门控2等待面板审批；kind=questions：需配合 questions 参数写入 1-3 个门控1问题；'
                + 'kind=selfcheck：追加一条自检结果（id 为 traceability/index/triggers 之一）。',
            parameters: {
                jobId: { type: 'string', required: true },
                kind: {
                    type: 'string',
                    enum: [...NOTE_KINDS],
                    description: '产物类型；缺省 other',
                },
                title: { type: 'string', required: true, description: '产物标题（draft 时为 skill 名称）' },
                text: { type: 'string', required: true, description: '产物正文' },
                questions: {
                    type: 'array',
                    description: 'kind=questions 时的 1-3 个选择题（见 schema 说明）',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            id: { type: 'string', required: true },
                            question: { type: 'string', required: true },
                            detail: { type: 'string' },
                            options: {
                                type: 'array',
                                required: true,
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        label: { type: 'string', required: true },
                                        context: { type: 'string', required: true, description: '该选项对应的书中章节背景说明' },
                                    },
                                },
                            },
                            multiSelect: { type: 'boolean' },
                        },
                    },
                },
                selfcheck: {
                    type: 'object',
                    description: 'kind=selfcheck 时的自检项',
                    additionalProperties: false,
                    properties: {
                        id: { type: 'string', required: true, enum: ['traceability', 'index', 'triggers'] },
                        title: { type: 'string', required: true },
                        pass: { type: 'boolean', required: true },
                        note: { type: 'string', required: true },
                    },
                },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderNoteResult(rec(value)) }],
            },
            async execute(args) {
                const input = args;
                try {
                    if (input.kind === 'questions' && input.questions !== undefined) {
                        const job = await service.setQuestions(input.jobId, input.questions.slice(0, 3));
                        return toJson({ ok: true, jobId: input.jobId, status: job.status, message: '门控1问题已发布：等待用户在面板作答' });
                    }
                    if (input.kind === 'selfcheck' && input.selfcheck !== undefined) {
                        const job = await service.addSelfCheck(input.jobId, input.selfcheck);
                        return toJson({ ok: true, jobId: input.jobId, status: job.status, selfcheck: job.skill.selfcheck });
                    }
                    const job = await service.addNote(input.jobId, { kind: input.kind, title: input.title, text: input.text });
                    return toJson({ ok: true, jobId: input.jobId, status: job.status, message: noteOutcome(job) });
                }
                catch (error) {
                    return toJson({ ok: false, jobId: input.jobId, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_read_chapter',
            description: '按行读取任务解析出的章节文件（先 book2skill_get_job 拿 chapters 列表，file 传文件名）。',
            parameters: {
                jobId: { type: 'string', required: true },
                file: { type: 'string', required: true, description: '章节文件名，如 ch04-第三章-MECE-分析法.md' },
                offset: { type: 'integer', description: '起始行号（1-based，缺省 1）' },
                limit: { type: 'integer', description: '行数（缺省 200）' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => {
                    const v = value;
                    return [{ type: 'text', text: `## ${v.file ?? '章节'}\n${v.text ?? ''}${v.truncated === true ? '\n…（已截断，可用 offset 续读）' : ''}` }];
                },
            },
            async execute(args) {
                const { jobId, file, offset = 1, limit = 200 } = args;
                try {
                    const result = await service.readChapter(jobId, file, offset, limit);
                    return toJson({ ok: true, ...result });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, file, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_zlib_search',
            description: '在 z-lib 搜索书籍（需要本机已有 z-lib 登录态 cookies；没有时返回 needAuth 与指引）。',
            parameters: {
                query: { type: 'string', required: true, description: '书名/作者/ISBN 关键词' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderZlibSearch(rec(value)) }],
            },
            timeoutMs: 120_000,
            async execute(args) {
                const { query } = args;
                try {
                    return toJson(await service.zlibSearch(query));
                }
                catch (error) {
                    return toJson({ ok: false, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_download',
            description: '把 z-lib 搜索结果中的 download 路径下载到任务工作目录（每任务一本）。',
            parameters: {
                jobId: { type: 'string', required: true },
                downloadPath: { type: 'string', required: true, description: '搜索结果的 download 字段（形如 /dl/xxxx）' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderJob(rec(value)) }],
            },
            timeoutMs: 600_000,
            async execute(args) {
                const { jobId, downloadPath } = args;
                try {
                    const job = await service.zlibDownload(jobId, downloadPath);
                    return toJson({ ok: true, jobId, status: job.status, path: job.book.path });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_import_ocr',
            description: 'OCR 兜底导入：当 book2skill_parse 报告 OCR 后端不可用时，用 paddle_ocr_layout 工具把扫描型 PDF 解析到某目录，'
                + '再用本工具把该目录的逐页 .md 导入任务章节（生成 toc.md 并标记解析完成）。',
            parameters: {
                jobId: { type: 'string', required: true },
                inputDir: { type: 'string', required: true, description: 'paddle_ocr_layout 输出的结果目录（含 doc_*.md）' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderImport(rec(value)) }],
            },
            timeoutMs: 120_000,
            async execute(args) {
                const { jobId, inputDir } = args;
                try {
                    const job = await service.importOcr(jobId, inputDir);
                    return toJson({ ok: true, jobId, status: job.status, chapters: job.parse.chapters.length });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, error: errorText(error) });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_install',
            description: '把已通过门控2的 SKILL.md 与章节 references 安装到目标目录（~/.claude/skills、~/.codex/skills、'
                + '~/kk_skill/skills 仓库，多选）。门控3：必须先在面板勾选目标并确认（未确认时本工具返回等待消息而非安装）。',
            parameters: {
                jobId: { type: 'string', required: true },
                name: { type: 'string', description: 'skill 目录名（缺省用草稿标题/书名，自动 sanitize）' },
                targets: {
                    type: 'array',
                    description: '安装目标（缺省用面板已勾选的目标）',
                    items: { type: 'string', enum: ['claude', 'codex', 'kk_skill'] },
                },
                overwrite: { type: 'boolean', description: '同名 skill 已存在时是否覆盖（缺省 false）' },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderInstall(rec(value)) }],
            },
            timeoutMs: 300_000,
            async execute(args) {
                const { jobId, name, targets, overwrite } = args;
                try {
                    const job = await service.install(jobId, { name, targets, overwrite });
                    return toJson({ ok: true, jobId, status: job.status, name: job.skill.name, result: job.install.result });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, error: errorText(error), gate: error instanceof Error && error.message.includes('门控') });
                }
            },
        })),
        register(defineTool({
            name: 'book2skill_cancel',
            description: '取消一个进行中的“书籍转技能”任务（已安装/已取消的不可再取消）。',
            parameters: {
                jobId: { type: 'string', required: true },
            },
            output: {
                schema: { type: 'json' },
                render: (_args, value) => [{ type: 'text', text: renderJob(rec(value)) }],
            },
            async execute(args) {
                const { jobId } = args;
                try {
                    const job = await service.cancel(jobId);
                    return toJson({ ok: true, jobId, status: job.status });
                }
                catch (error) {
                    return toJson({ ok: false, jobId, error: errorText(error) });
                }
            },
        })),
    ];
}
// ── renders ─────────────────────────────────────────────────────────────
function stageLabel(stage) {
    return STAGES.find(s => s.id === stage)?.label ?? `阶段${stage}`;
}
function startHint(job) {
    return job.status === 'pending'
        ? '任务已创建。下一步：book2skill_parse 解析书籍。'
        : job.status === 'failed'
            ? '任务创建失败，详见 error。'
            : '任务创建完成。';
}
function renderStart(value) {
    const lines = [
        `任务状态：${value.ok === true ? '创建成功' : '创建失败'}`,
        value.jobId === undefined ? '' : `jobId：${value.jobId}`,
        value.title === undefined ? '' : `书名：${value.title}`,
        value.hint === undefined ? '' : String(value.hint),
    ];
    return lines.filter(line => line !== '').join('\n');
}
function renderParse(value) {
    if (value.ok !== true)
        return `解析失败：${value.error ?? '未知错误'}`;
    return `解析完成：${value.kind ?? '?'} 格式，共 ${value.chapters ?? 0} 章。\n\n${value.toc ?? ''}`;
}
function nextStep(status) {
    switch (status) {
        case 'pending': return '调用 book2skill_parse 解析书籍';
        case 'parsed': return '浅读：读 toc.md、前言、第一章前200行、结语，写浅读摘要（stage_note kind=summary）';
        case 'reading': return '浅读完成后设计 ≤3 个门控1问题（stage_note kind=questions）';
        case 'awaiting_gate1': return '门控1等待中：用户在面板作答后状态自动变为 deep_reading';
        case 'deep_reading': return '深读 3-5 个核心方法论章节（read_chapter），产出知识地图（kind=knowledge-map）';
        case 'drafting': return '基于知识地图撰写 SKILL.md 草稿（kind=draft），随后自检（kind=selfcheck 三次）';
        case 'awaiting_gate2': return '门控2等待中：用户在面板审批草稿与自检（通过/重新生成）';
        case 'awaiting_gate3': return '门控3等待中：用户在面板勾选安装目标并确认';
        case 'installing': return '安装确认已收到：调用 book2skill_install 执行安装';
        case 'installed': return '已完成安装';
        case 'failed': return '任务失败：读 error 字段决定重试或放弃';
        case 'cancelled': return '任务已取消';
        default: return status;
    }
}
function renderJob(value) {
    if (value.ok !== true)
        return `任务读取失败：${value.error ?? '未知错误'}`;
    const lines = [
        `jobId：${value.jobId ?? ''}`,
        `状态：${value.status ?? ''}（${stageLabel(value.stage)}）`,
    ];
    const book = value.book;
    if (book !== undefined) {
        lines.push(`书籍：${book.title ?? book.path ?? book.url ?? '未设置'}（${book.format ?? '未解析'}）`);
    }
    const ocr = value.ocr;
    if (ocr !== undefined && ocr !== null && (ocr.state === 'running' || ocr.state === 'queued')) {
        lines.push(`OCR：${ocr.state === 'queued' ? '排队中' : '进行中'} ${ocr.page ?? 0}/${ocr.total ?? 0}`);
    }
    const chapters = value.chapters;
    if (chapters !== undefined && chapters.length > 0) {
        lines.push(`章节：${chapters.length} 个（${chapters.slice(0, 5).map(c => c.file).join('、')}${chapters.length > 5 ? '…' : ''}）`);
    }
    const notes = value.notes;
    if (notes !== undefined && notes.length > 0) {
        lines.push(`笔记：${notes.map(n => `${n.kind}/${n.title}`).join('、')}`);
    }
    const gate1 = value.gate1;
    if (gate1 !== undefined && gate1.status !== 'closed')
        lines.push(`门控1：${gate1.status}`);
    const gate2 = value.gate2;
    if (gate2 !== undefined && gate2.status !== 'closed')
        lines.push(`门控2：${gate2.status}${gate2.verdict === undefined ? '' : `（${gate2.verdict}）`}`);
    lines.push(`下一步：${value.next ?? ''}`);
    return lines.join('\n');
}
function renderNoteResult(value) {
    if (value.ok !== true)
        return `记录失败：${value.error ?? '未知错误'}`;
    return `已记录（状态：${value.status ?? ''}）。${value.message ?? ''}`;
}
function noteOutcome(job) {
    return job.status === 'awaiting_gate2'
        ? '草稿已写入，门控2等待用户在面板审批。'
        : '已记录。';
}
function renderImport(value) {
    if (value.ok !== true)
        return `导入失败：${value.error ?? '未知错误'}`;
    return `已导入 OCR 结果：${value.chapters ?? 0} 个章节文件，状态 ${value.status ?? ''}。下一步：浅读建地图。`;
}
function renderZlibSearch(value) {
    if (value.needAuth === true)
        return `需要登录：${value.hint ?? ''}`;
    if (value.ok !== true)
        return `搜索失败：${value.error ?? '未知错误'}${value.hint === undefined ? '' : `\n${value.hint}`}`;
    const rows = value.rows;
    if (rows === undefined || rows.length === 0)
        return `无结果。${value.hint ?? ''}`;
    return rows.map((row, index) => `${index + 1}. ${row.title} — ${row.author} (${row.year}) ${row.extension} ${row.filesize}\n   download: ${row.download}`).join('\n');
}
function renderInstall(value) {
    if (value.ok !== true) {
        const gate = value.gate === true ? '【门控3】' : '';
        return `安装未执行${gate}：${value.error ?? '未知错误'}`;
    }
    const result = value.result;
    const rows = (result ?? []).map(item => `${item.ok ? '✓' : '✗'} ${INSTALL_TARGET_LABELS[item.target] ?? item.target} → ${item.path}${item.error === undefined ? '' : `（${item.error}）`}`);
    return `安装完成（skill：${value.name ?? ''}）\n${rows.join('\n')}`;
}
