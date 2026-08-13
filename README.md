# dsh-book2skill

书籍转技能（Book → Skill）：DSH 插件包，把一个 5 阶段长任务工作流带进 DeepSeek Harness——
**获取书籍 → 解析分章 → 深度阅读 → 生成 SKILL.md → 安装**，中途有 **3 个人类门控**。

确定性步骤（EPUB 解析 / PDF 提取 / OCR / 安装复制）是宿主工具；理解与生成（浅读建地图、
设计方向问题、深读核心章、撰写 SKILL.md 与自检）由 agent 执行；浏览器面板负责 5 阶段时间线
展示与门控审批。任务状态存宿主存储域，**跨会话、跨重启可恢复，可随时取消**。

## 架构

| 平面 | 内容 |
|------|------|
| 宿主（`src/index.ts`） | `book2skill` 存储域（jobs 表）、`/book2skill` HTTP 面板路由、10 个 `book2skill_*` 工具 |
| 浏览器（`src/client/`） | `conversation.view` 时间线面板（React），纯 fetch 轮询宿主路由 |
| 脚本（`scripts/`） | `parse_epub.py`（修复版：标题行不再丢失、>5000 字章节按 `##` 拆分）、`pdf_parse.py`（PyPDF2 探测/分块） |

## 5 阶段 + 3 门控

1. **获取书籍**：本地路径（目录选择器，browse 能力）/ z-lib 搜索下载（复用 book-downloader 的 cookies，无硬编码密钥）
2. **解析分章**：EPUB → 按章 md + toc.md（<200 字合并、>5000 字拆分）；PDF → PyPDF2 先探测（<5000 有效字或乱码判扫描型）→ 扫描型走 OCR，面板显示逐页进度（37/420）与「排队中」
3. **深度阅读【门控1】**：agent 浅读建地图 → 发布 ≤3 个选择题（选项带书中章节背景）→ 用户在面板作答 → agent 深读 3-5 个核心章
4. **生成 SKILL.md【门控2】**：可编辑预览 + 知识地图 + 3 项自检清单（SOP 可溯源 / 索引准确 / 触发词宽窄，不通过标红，可一键让 agent 修）→ [重新生成] / [通过并继续]
5. **安装【门控3】**：目标多选（~/.claude/skills、~/.codex/skills、~/kk_skill/skills 同步仓库）→ 确认后 agent 调 `book2skill_install` → 完成卡（触发示例 chips + 复制即试）

## OCR 解耦（三级探测，无硬依赖）

本插件**不 inject** `paddleOcr`（缺失服务会永远挂起本行）。运行时按级探测：

1. `ctx.get('paddleOcr')` 宿主服务（dsh-paddle-ocr 发布该服务时自动生效，契约见 `src/vendor-shims.d.ts`）
2. `/paddle-ocr` loopback RPC（已安装的 dsh-paddle-ocr 面板任务通道：`task/start → task/status 轮询 → task/commit`，逐页进度透传）
3. HTTP 直调 stub（`BOOK2SKILL_OCR_ENDPOINT`，缺省 `http://127.0.0.1:8011/api/pdf/ocr`）

全部不可用时明确报错并给出 agent 兜底路径：用 `paddle_ocr_layout` 工具解析 → `book2skill_import_ocr` 导入。

## 宿主工具

`book2skill_start` / `book2skill_parse` / `book2skill_get_job` / `book2skill_stage_note`
（summary·knowledge-map·deep-read·draft·questions·selfcheck）/ `book2skill_read_chapter` /
`book2skill_zlib_search` / `book2skill_download` / `book2skill_import_ocr` / `book2skill_install` / `book2skill_cancel`

## 兼容性

- DSH `>=0.0.1-rc.2 <0.0.2`（使用 rc.2 的 `ctx.shell` 能力契约）
- Node.js `^22.19.0 || >=24.0.0`
- Profile Bundle：`package.json#dsh.bundle.patch` 自动应用 `cordis.patch.yml`

## 构建与安装

```bash
# 1. 用当前 DSH rc.2 源码链接类型依赖并完整验收
npm ci
DSH_WORKSPACE_ROOT=/path/to/dsh-rc2 npm run setup:dsh-workspace
npm run typecheck
npm test
npm run build

# 2. 打包并通过插件命令安装到目标 profile
npm pack
dsh plugin --profile web add file:/absolute/path/dsh-book2skill-0.1.1.tgz

# 3. 重启 dsh web（宿主行需要进程重启），浏览器刷新后对话区出现「书籍转技能」标签
```

不要再把 `book2skill` 行手工写进 profile：插件包已经声明 Profile Bundle，手工追加会形成重复
loader entry。发布到 npm 时 `publishConfig.access` 固定为 `restricted`。

宿主半的代码改动需要重启 `dsh web` 生效；浏览器半重建 `lib/client.js` 后，HMR 会自动重载该插件
（页面无需刷新；未开 `pnpm run dev:web` 时手动 `npm run build` 即可触发）。

## 红线自查

- 不硬编码任何密钥：z-lib 登录态读 `~/.claude/skills/book-downloader/auth/zlib-cookies.json`（用户已有），OCR token 由 dsh-paddle-ocr 的凭据保险箱管理
- 生成内容可溯源：SOP 步骤必须来自 references 章节（自检1 强制回读校验），references 索引与触发词均有自检项

## 许可

BSD-3-Clause。面板素材（assets/*.svg）由 Codex 生成。
