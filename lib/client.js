window.__ModuleLoader__.load({
	id: "dsh-book2skill",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/rpc.ts
		async function request(path, init) {
			const response = await fetch(path, {
				...init,
				headers: init?.body === void 0 ? { "content-type": "application/json" } : { "content-type": "application/json" }
			});
			let body;
			try {
				body = await response.json();
			} catch {
				throw new Error(`面板请求失败：${response.status}`);
			}
			if (!response.ok) throw new Error(body.message ?? `请求失败（HTTP ${response.status}）`);
			return body;
		}
		const api = {
			listJobs: () => request("/book2skill/jobs"),
			getJob: (jobId) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}`),
			createJob: (input) => request("/book2skill/jobs", {
				method: "POST",
				body: JSON.stringify(input)
			}),
			cancel: (jobId) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" }),
			saveDraft: (jobId, draft) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/draft`, {
				method: "POST",
				body: JSON.stringify({ draft })
			}),
			answerGate1: (jobId, answers) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate1/answer`, {
				method: "POST",
				body: JSON.stringify({ answers })
			}),
			decideGate2: (jobId, verdict, draft) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate2/decision`, {
				method: "POST",
				body: JSON.stringify({
					verdict,
					draft
				})
			}),
			setTargets: (jobId, targets) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate3/targets`, {
				method: "POST",
				body: JSON.stringify({ targets })
			}),
			confirmInstall: (jobId) => request(`/book2skill/jobs/${encodeURIComponent(jobId)}/gate3/confirm`, { method: "POST" }),
			pickerList: (path) => request(`/book2skill/picker/list${path === void 0 ? "" : `?path=${encodeURIComponent(path)}`}`),
			zlibSearch: (query) => request("/book2skill/zlib/search", {
				method: "POST",
				body: JSON.stringify({ query })
			}),
			zlibDownload: (jobId, downloadPath) => request("/book2skill/zlib/download", {
				method: "POST",
				body: JSON.stringify({
					jobId,
					downloadPath
				})
			})
		};
		//#endregion
		//#region \0dsh-css:src/client/Book2SkillPanel.module.css.mjs
		const css = "._8cIMKG_panel{background:var(--color-surface,#1e222a);height:100%;min-height:0;color:var(--color-text,#e6e8eb);flex-direction:column;display:flex;overflow:hidden}._8cIMKG_header{border-bottom:1px solid var(--color-border,#3a3f47);flex:none;padding:8px 12px}._8cIMKG_banner{object-fit:contain;width:100%;max-height:96px;margin-bottom:4px;display:block}._8cIMKG_headerRow{align-items:baseline;gap:10px;display:flex}._8cIMKG_title{margin:0;font-size:15px;font-weight:650}._8cIMKG_subtitle{color:var(--color-text-secondary,#8a8f98);font-size:12px}._8cIMKG_body{flex:1;min-height:0;display:flex}._8cIMKG_sidebar{border-right:1px solid var(--color-border,#3a3f47);flex:none;width:300px;padding:10px;overflow-y:auto}._8cIMKG_sideTitle{color:var(--color-text-secondary,#8a8f98);text-transform:uppercase;letter-spacing:.04em;margin:12px 0 6px;font-size:12px;font-weight:600}._8cIMKG_empty{text-align:center;padding:8px}._8cIMKG_empty img{opacity:.85;width:100%;max-width:240px}._8cIMKG_empty p{color:var(--color-text-secondary,#8a8f98);font-size:12px;line-height:1.6}._8cIMKG_jobRow,._8cIMKG_jobRowActive{text-align:left;width:100%;color:var(--color-text,#e6e8eb);cursor:pointer;background:0 0;border:1px solid #0000;border-radius:8px;flex-direction:column;gap:2px;margin-bottom:4px;padding:7px 8px;font-size:13px;display:flex}._8cIMKG_jobRow:hover{background:var(--color-surface-hover,#262b34)}._8cIMKG_jobRowActive{background:var(--color-accent-soft,#1e2c4a);border-color:var(--color-accent,#4f6ef7)}._8cIMKG_jobTitle{text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}._8cIMKG_jobMeta{color:var(--color-text-secondary,#8a8f98);font-size:11px}._8cIMKG_main{flex:1;min-width:0;padding:12px 16px;overflow-y:auto}._8cIMKG_placeholder{color:var(--color-text-secondary,#8a8f98);text-align:center;padding:32px}._8cIMKG_error{border:1px solid var(--color-danger,#e5484d);background:var(--color-danger-soft,#3a1d20);color:var(--color-danger,#e5484d);white-space:pre-wrap;border-radius:8px;margin:8px 12px 0;padding:8px 10px;font-size:12px}._8cIMKG_jobHeader{justify-content:space-between;align-items:flex-start;margin-bottom:10px;display:flex}._8cIMKG_jobName{font-size:16px;font-weight:700}._8cIMKG_jobStatus{color:var(--color-text-secondary,#8a8f98);margin-top:2px;font-size:12px}._8cIMKG_jobError{color:var(--color-danger,#e5484d);max-width:520px;margin-top:4px;font-size:12px}._8cIMKG_timeline{gap:6px;margin:0 0 14px;padding:0;list-style:none;display:flex}._8cIMKG_timeline li{border:1px solid var(--color-border,#3a3f47);color:var(--color-text-secondary,#8a8f98);border-radius:10px;flex-direction:column;flex:1;align-items:center;gap:4px;padding:8px 4px;font-size:11px;display:flex}._8cIMKG_stageIcon{opacity:.55;width:24px;height:24px}._8cIMKG_stageDone{background:var(--color-success-soft,#14302a);border-color:var(--color-success,#22a06b)!important;color:var(--color-text,#e6e8eb)!important}._8cIMKG_stageDone ._8cIMKG_stageIcon{opacity:1}._8cIMKG_stageActive{background:var(--color-accent-soft,#1e2c4a);border-color:var(--color-accent,#4f6ef7)!important;color:var(--color-text,#e6e8eb)!important}._8cIMKG_stageActive ._8cIMKG_stageIcon{opacity:1}._8cIMKG_stageLabel{text-align:center;line-height:1.3}._8cIMKG_gateBadge{background:var(--color-accent,#4f6ef7);color:#fff;vertical-align:middle;border-radius:999px;margin-left:8px;padding:1px 8px;font-size:11px;display:inline-block}._8cIMKG_stageBody{flex-direction:column;gap:12px;display:flex}._8cIMKG_card{border:1px solid var(--color-border,#3a3f47);background:var(--color-surface-raised,#232833);border-radius:12px;padding:12px 14px}._8cIMKG_cardTitle{margin-bottom:8px;font-size:13px;font-weight:650}._8cIMKG_badge{border:1px solid var(--color-border,#3a3f47);color:var(--color-text-secondary,#8a8f98);border-radius:999px;margin-left:8px;padding:0 7px;font-size:11px;display:inline-block}._8cIMKG_hint{color:var(--color-text-secondary,#8a8f98);margin:6px 0 0;font-size:12px;line-height:1.6}._8cIMKG_warning{color:var(--color-warning,#e5a50a);margin-top:6px;font-size:12px;line-height:1.6}._8cIMKG_pre{background:var(--color-code-bg,#1a1e26);white-space:pre-wrap;word-break:break-word;border-radius:8px;max-height:320px;margin:0;padding:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.55;overflow-y:auto}._8cIMKG_textarea{box-sizing:border-box;border:1px solid var(--color-border,#3a3f47);background:var(--color-code-bg,#1a1e26);width:100%;min-height:300px;color:var(--color-text,#e6e8eb);resize:vertical;border-radius:8px;padding:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.5}._8cIMKG_field{margin-bottom:8px}._8cIMKG_fieldLabel{color:var(--color-text-secondary,#8a8f98);margin-bottom:3px;font-size:11px;display:block}._8cIMKG_pathRow{gap:6px;display:flex}._8cIMKG_input{border:1px solid var(--color-border,#3a3f47);background:var(--color-input-bg,#1a1e26);min-width:0;color:var(--color-text,#e6e8eb);border-radius:8px;flex:1;padding:6px 8px;font-size:12px}._8cIMKG_formActions{flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px;display:flex}._8cIMKG_primaryButton,._8cIMKG_secondaryButton,._8cIMKG_dangerButton,._8cIMKG_linkButton{cursor:pointer;border:1px solid #0000;border-radius:8px;padding:6px 12px;font-size:12px}._8cIMKG_primaryButton{background:var(--color-accent,#4f6ef7);color:#fff}._8cIMKG_primaryButton:disabled,._8cIMKG_secondaryButton:disabled,._8cIMKG_dangerButton:disabled{opacity:.45;cursor:not-allowed}._8cIMKG_secondaryButton{border-color:var(--color-border,#3a3f47);color:var(--color-text,#e6e8eb);background:0 0}._8cIMKG_dangerButton{border-color:var(--color-danger,#e5484d);color:var(--color-danger,#e5484d);background:0 0}._8cIMKG_linkButton{color:var(--color-text-secondary,#8a8f98);background:0 0;text-decoration:underline}._8cIMKG_ocr{margin:8px 0}._8cIMKG_ocrRow{margin-bottom:4px;font-size:12px}._8cIMKG_progressTrack{background:var(--color-border,#3a3f47);border-radius:999px;height:8px;overflow:hidden}._8cIMKG_progressFill{background:var(--color-accent,#4f6ef7);border-radius:999px;height:100%;transition:width .4s}._8cIMKG_chapterTree{max-height:340px;margin:8px 0 0;padding:0;list-style:none;overflow-y:auto}._8cIMKG_chapterTree li{border-bottom:1px solid var(--color-border,#3a3f47);justify-content:space-between;gap:10px;padding:5px 6px;font-size:12px;display:flex}._8cIMKG_chapterName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._8cIMKG_chapterChars{color:var(--color-text-secondary,#8a8f98);font-variant-numeric:tabular-nums;flex:none}._8cIMKG_question{border-bottom:1px solid var(--color-border,#3a3f47);margin-bottom:14px;padding-bottom:12px}._8cIMKG_questionText{font-size:13px;font-weight:600}._8cIMKG_questionDetail{color:var(--color-text-secondary,#8a8f98);margin:3px 0 6px;font-size:12px}._8cIMKG_option{cursor:pointer;border-radius:8px;align-items:flex-start;gap:8px;padding:6px 8px;font-size:12px;display:flex}._8cIMKG_option:hover{background:var(--color-surface-hover,#262b34)}._8cIMKG_option input{margin-top:2px}._8cIMKG_optionLabel{font-weight:600}._8cIMKG_optionContext{color:var(--color-text-secondary,#8a8f98);margin-top:2px;font-size:11px;line-height:1.5;display:block}._8cIMKG_checkPass,._8cIMKG_checkFail{border-radius:8px;align-items:baseline;gap:8px;margin-bottom:6px;padding:7px 8px;font-size:12px;display:flex}._8cIMKG_checkPass{background:var(--color-success-soft,#14302a)}._8cIMKG_checkFail{background:var(--color-danger-soft,#3a1d20)}._8cIMKG_checkMark{font-weight:700}._8cIMKG_checkPass ._8cIMKG_checkMark{color:var(--color-success,#22a06b)}._8cIMKG_checkFail ._8cIMKG_checkMark{color:var(--color-danger,#e5484d)}._8cIMKG_checkTitle{flex:none;font-weight:650}._8cIMKG_checkNote{color:var(--color-text-secondary,#8a8f98);line-height:1.5}._8cIMKG_celebrate{width:100%;max-width:420px;margin:4px auto 10px;display:block}._8cIMKG_chips{flex-wrap:wrap;gap:6px;margin-top:6px;display:flex}._8cIMKG_chip{border:1px solid var(--color-accent,#4f6ef7);color:var(--color-accent,#4f6ef7);cursor:pointer;background:0 0;border-radius:999px;padding:5px 10px;font-size:12px}._8cIMKG_chip:hover{background:var(--color-accent-soft,#1e2c4a)}._8cIMKG_zlib{border-top:1px dashed var(--color-border,#3a3f47);margin-top:8px;padding-top:8px}._8cIMKG_zlibList{max-height:220px;margin:8px 0;padding:0;list-style:none;overflow-y:auto}._8cIMKG_zlibRow{margin-bottom:4px}._8cIMKG_zlibLabel{cursor:pointer;border-radius:8px;align-items:flex-start;gap:8px;padding:6px;font-size:12px;display:flex}._8cIMKG_zlibLabel:hover{background:var(--color-surface-hover,#262b34)}._8cIMKG_zlibLabel input{margin-top:2px}._8cIMKG_zlibInfo{flex-direction:column;gap:2px;min-width:0;display:flex}._8cIMKG_zlibTitle{font-weight:600;line-height:1.4}._8cIMKG_zlibMeta{color:var(--color-text-secondary,#8a8f98);font-size:11px}._8cIMKG_modalBackdrop{z-index:50;background:#00000080;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}._8cIMKG_modal{border:1px solid var(--color-border,#3a3f47);background:var(--color-surface,#1e222a);width:min(560px,90vw);max-height:80vh;color:var(--color-text,#e6e8eb);border-radius:12px;padding:14px;overflow-y:auto}._8cIMKG_modalTitle{margin-bottom:8px;font-size:14px;font-weight:650}._8cIMKG_crumbs{flex-wrap:wrap;gap:2px;margin-bottom:8px;display:flex}._8cIMKG_crumb{color:var(--color-accent,#4f6ef7);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px}._8cIMKG_dirList{max-height:300px;margin:0;padding:0;list-style:none;overflow-y:auto}._8cIMKG_dirEntry{text-align:left;width:100%;color:var(--color-text,#e6e8eb);cursor:pointer;background:0 0;border:none;border-radius:8px;padding:6px 8px;font-size:12px}._8cIMKG_dirEntry:hover{background:var(--color-surface-hover,#262b34)}._8cIMKG_modalActions{justify-content:flex-end;gap:8px;margin-top:10px;display:flex}";
		const tagId = "dsh-book2skill/Book2SkillPanel.module.css";
		const pluginId = "dsh-book2skill";
		const registryKey = Symbol.for("dsh-book2skill/css");
		const globalRegistry = globalThis;
		const registry = globalRegistry[registryKey] instanceof Map ? globalRegistry[registryKey] : /* @__PURE__ */ new Map();
		globalRegistry[registryKey] = registry;
		registry.set(tagId, css);
		if (typeof document !== "undefined") {
			let tag = Array.from(document.querySelectorAll("style[data-plugin-css]")).find((candidate) => candidate.dataset.pluginCss === tagId);
			if (tag === void 0) {
				tag = document.createElement("style");
				tag.dataset.plugin = pluginId;
				tag.dataset.pluginCss = tagId;
				document.head.appendChild(tag);
			}
			tag.textContent = css;
		}
		var Book2SkillPanel_module_css_default = {
			"linkButton": "_8cIMKG_linkButton",
			"pathRow": "_8cIMKG_pathRow",
			"chip": "_8cIMKG_chip",
			"fieldLabel": "_8cIMKG_fieldLabel",
			"dangerButton": "_8cIMKG_dangerButton",
			"sidebar": "_8cIMKG_sidebar",
			"chapterName": "_8cIMKG_chapterName",
			"question": "_8cIMKG_question",
			"body": "_8cIMKG_body",
			"zlibLabel": "_8cIMKG_zlibLabel",
			"jobName": "_8cIMKG_jobName",
			"jobTitle": "_8cIMKG_jobTitle",
			"checkPass": "_8cIMKG_checkPass",
			"hint": "_8cIMKG_hint",
			"title": "_8cIMKG_title",
			"chips": "_8cIMKG_chips",
			"zlib": "_8cIMKG_zlib",
			"placeholder": "_8cIMKG_placeholder",
			"jobMeta": "_8cIMKG_jobMeta",
			"field": "_8cIMKG_field",
			"formActions": "_8cIMKG_formActions",
			"headerRow": "_8cIMKG_headerRow",
			"header": "_8cIMKG_header",
			"primaryButton": "_8cIMKG_primaryButton",
			"option": "_8cIMKG_option",
			"input": "_8cIMKG_input",
			"zlibMeta": "_8cIMKG_zlibMeta",
			"jobRow": "_8cIMKG_jobRow",
			"warning": "_8cIMKG_warning",
			"banner": "_8cIMKG_banner",
			"modalTitle": "_8cIMKG_modalTitle",
			"pre": "_8cIMKG_pre",
			"questionDetail": "_8cIMKG_questionDetail",
			"secondaryButton": "_8cIMKG_secondaryButton",
			"stageDone": "_8cIMKG_stageDone",
			"textarea": "_8cIMKG_textarea",
			"celebrate": "_8cIMKG_celebrate",
			"zlibTitle": "_8cIMKG_zlibTitle",
			"badge": "_8cIMKG_badge",
			"stageLabel": "_8cIMKG_stageLabel",
			"optionContext": "_8cIMKG_optionContext",
			"dirEntry": "_8cIMKG_dirEntry",
			"checkFail": "_8cIMKG_checkFail",
			"zlibList": "_8cIMKG_zlibList",
			"main": "_8cIMKG_main",
			"zlibRow": "_8cIMKG_zlibRow",
			"checkTitle": "_8cIMKG_checkTitle",
			"subtitle": "_8cIMKG_subtitle",
			"stageIcon": "_8cIMKG_stageIcon",
			"stageBody": "_8cIMKG_stageBody",
			"panel": "_8cIMKG_panel",
			"modalActions": "_8cIMKG_modalActions",
			"timeline": "_8cIMKG_timeline",
			"ocr": "_8cIMKG_ocr",
			"gateBadge": "_8cIMKG_gateBadge",
			"sideTitle": "_8cIMKG_sideTitle",
			"stageActive": "_8cIMKG_stageActive",
			"jobRowActive": "_8cIMKG_jobRowActive",
			"chapterChars": "_8cIMKG_chapterChars",
			"checkNote": "_8cIMKG_checkNote",
			"zlibInfo": "_8cIMKG_zlibInfo",
			"modalBackdrop": "_8cIMKG_modalBackdrop",
			"dirList": "_8cIMKG_dirList",
			"questionText": "_8cIMKG_questionText",
			"crumbs": "_8cIMKG_crumbs",
			"error": "_8cIMKG_error",
			"empty": "_8cIMKG_empty",
			"jobStatus": "_8cIMKG_jobStatus",
			"card": "_8cIMKG_card",
			"chapterTree": "_8cIMKG_chapterTree",
			"progressFill": "_8cIMKG_progressFill",
			"progressTrack": "_8cIMKG_progressTrack",
			"optionLabel": "_8cIMKG_optionLabel",
			"crumb": "_8cIMKG_crumb",
			"jobHeader": "_8cIMKG_jobHeader",
			"ocrRow": "_8cIMKG_ocrRow",
			"jobError": "_8cIMKG_jobError",
			"modal": "_8cIMKG_modal",
			"cardTitle": "_8cIMKG_cardTitle",
			"checkMark": "_8cIMKG_checkMark"
		};
		//#endregion
		//#region src/client/Book2SkillPanel.tsx
		/**
		* Book2SkillPanel — the 5-stage timeline view registered as a
		* conversation.view tab. Data comes from the host /book2skill routes; the
		* panel never fabricates progress — gates wait on the human while the
		* agent polls job state through its tools.
		* @module
		*/
		const STAGE_DEFS = [
			{
				id: 1,
				label: "获取书籍",
				icon: "/book2skill/assets/stage-fetch.svg"
			},
			{
				id: 2,
				label: "解析分章",
				icon: "/book2skill/assets/stage-parse.svg"
			},
			{
				id: 3,
				label: "深度阅读",
				icon: "/book2skill/assets/stage-understand.svg"
			},
			{
				id: 4,
				label: "生成 SKILL.md",
				icon: "/book2skill/assets/stage-generate.svg"
			},
			{
				id: 5,
				label: "安装",
				icon: "/book2skill/assets/stage-install.svg"
			}
		];
		const ACTIVE_STATUSES = /* @__PURE__ */ new Set([
			"pending",
			"fetching",
			"parsing",
			"reading",
			"awaiting_gate1",
			"deep_reading",
			"drafting",
			"awaiting_gate2",
			"installing",
			"awaiting_gate3"
		]);
		const POLL_MS = 1200;
		function Book2SkillPanel() {
			const [jobs, setJobs] = (0, react.useState)([]);
			const [selectedId, setSelectedId] = (0, react.useState)(null);
			const [job, setJob] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const mounted = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			const refreshJobs = (0, react.useCallback)(async () => {
				try {
					const result = await api.listJobs();
					if (!mounted.current) return;
					setJobs(result.jobs);
					setError(null);
				} catch (err) {
					if (mounted.current) setError(err instanceof Error ? err.message : String(err));
				}
			}, []);
			(0, react.useEffect)(() => {
				refreshJobs();
			}, [refreshJobs]);
			const refreshJob = (0, react.useCallback)(async (jobId) => {
				try {
					const result = await api.getJob(jobId);
					if (!mounted.current) return;
					setJob(result.job);
					setError(null);
				} catch (err) {
					if (mounted.current) setError(err instanceof Error ? err.message : String(err));
				}
			}, []);
			(0, react.useEffect)(() => {
				if (selectedId === null) return;
				refreshJob(selectedId);
				const timer = setInterval(() => {
					if (selectedId === null) return;
					refreshJob(selectedId).then(() => {
						refreshJobs();
					});
				}, POLL_MS);
				return () => clearInterval(timer);
			}, [
				selectedId,
				refreshJob,
				refreshJobs
			]);
			const select = (jobId) => {
				setSelectedId(jobId);
				setJob(null);
			};
			const applyJob = (next) => {
				setJob(next);
				setSelectedId(next.id);
				refreshJobs();
			};
			const run = async (fn) => {
				setBusy(true);
				setError(null);
				try {
					await fn();
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: Book2SkillPanel_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: Book2SkillPanel_module_css_default.banner,
							src: "/book2skill/assets/banner.svg",
							alt: "书籍 → 章节 → 技能卡"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.headerRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: Book2SkillPanel_module_css_default.title,
								children: "书籍转技能"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.subtitle,
								children: "EPUB/PDF → 5 阶段 → 可安装 skill（3 个人类门控）"
							})]
						})]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.error,
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.body,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
							className: Book2SkillPanel_module_css_default.sidebar,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewJobForm, {
									onCreated: applyJob,
									busy,
									onBusy: setBusy,
									setError
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Book2SkillPanel_module_css_default.sideTitle,
									children: "任务"
								}),
								jobs.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Book2SkillPanel_module_css_default.empty,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
										src: "/book2skill/assets/empty-state.svg",
										alt: "暂无任务"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "还没有任务。左侧输入本地书籍路径（EPUB/PDF），或从 z-lib 搜索下载。" })]
								}),
								jobs.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: row.id === selectedId ? Book2SkillPanel_module_css_default.jobRowActive : Book2SkillPanel_module_css_default.jobRow,
									onClick: () => select(row.id),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Book2SkillPanel_module_css_default.jobTitle,
										children: row.title
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Book2SkillPanel_module_css_default.jobMeta,
										children: [
											statusLabel(row.status),
											" · 阶段",
											row.stage
										]
									})]
								}, row.id))
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("main", {
							className: Book2SkillPanel_module_css_default.main,
							children: job === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Book2SkillPanel_module_css_default.placeholder,
								children: "← 选择左侧任务查看 5 阶段进度与门控"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobHeader, {
									job,
									onCancel: () => run(async () => {
										const result = await api.cancel(job.id);
										applyJob(result.job);
									}),
									busy
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Timeline, {
									stage: job.stage,
									status: job.status
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StageBody, {
									job,
									onApply: applyJob,
									busy,
									run
								})
							] })
						})]
					})
				]
			});
		}
		function statusLabel(status) {
			return {
				pending: "待解析",
				fetching: "下载中",
				parsing: "解析中",
				parsed: "已解析",
				reading: "浅读中",
				awaiting_gate1: "门控1：等待作答",
				deep_reading: "深读中",
				drafting: "起草中",
				awaiting_gate2: "门控2：等待审批",
				installing: "安装中",
				awaiting_gate3: "门控3：确认目标",
				installed: "已安装",
				cancelled: "已取消",
				failed: "失败"
			}[status] ?? status;
		}
		function JobHeader(props) {
			const { job } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.jobHeader,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.jobName,
						children: job.title ?? job.id
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.jobStatus,
						children: statusLabel(job.status)
					}),
					job.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.jobError,
						children: job.error
					})
				] }), ACTIVE_STATUSES.has(job.status) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: Book2SkillPanel_module_css_default.dangerButton,
					disabled: props.busy,
					onClick: props.onCancel,
					children: "取消任务"
				})]
			});
		}
		function Timeline(props) {
			const { stage, status } = props;
			stage > 1 || [
				"cancelled",
				"failed",
				"installed"
			].includes(status);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ol", {
				className: Book2SkillPanel_module_css_default.timeline,
				children: [STAGE_DEFS.map((def) => {
					const done = def.id < stage;
					const active = def.id === stage;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: done ? Book2SkillPanel_module_css_default.stageDone : active ? Book2SkillPanel_module_css_default.stageActive : Book2SkillPanel_module_css_default.stagePending,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								className: Book2SkillPanel_module_css_default.stageIcon,
								src: def.icon,
								alt: ""
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.stageLabel,
								children: def.label
							}),
							active && status.startsWith("awaiting_gate") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.gateBadge,
								children: "等待你"
							})
						]
					}, def.id);
				}), void 0]
			});
		}
		function NewJobForm(props) {
			const [path, setPath] = (0, react.useState)("");
			const [title, setTitle] = (0, react.useState)("");
			const [pickerOpen, setPickerOpen] = (0, react.useState)(false);
			const [zlibOpen, setZlibOpen] = (0, react.useState)(false);
			const create = async () => {
				if (path.trim() === "" && title.trim() === "") return;
				props.onBusy(true);
				try {
					const result = await api.createJob({
						bookPath: path.trim() === "" ? void 0 : path.trim(),
						title: title.trim() === "" ? void 0 : title.trim()
					});
					props.onCreated(result.job);
					setPath("");
					setTitle("");
				} catch (error) {
					props.setError(error instanceof Error ? error.message : String(error));
				} finally {
					props.onBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.newJob,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: Book2SkillPanel_module_css_default.fieldLabel,
							children: "本地书籍路径（EPUB / PDF）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.pathRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: Book2SkillPanel_module_css_default.input,
								value: path,
								placeholder: "/home/you/books/某书.epub",
								onChange: (event) => setPath(event.target.value)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.secondaryButton,
								onClick: () => setPickerOpen(true),
								children: "浏览…"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: Book2SkillPanel_module_css_default.fieldLabel,
							children: "书名（可选）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: Book2SkillPanel_module_css_default.input,
							value: title,
							placeholder: "缺省取文件名",
							onChange: (event) => setTitle(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.formActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: Book2SkillPanel_module_css_default.primaryButton,
							disabled: props.busy || path.trim() === "" && title.trim() === "",
							onClick: () => void create(),
							children: "创建任务"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: Book2SkillPanel_module_css_default.secondaryButton,
							onClick: () => setZlibOpen((open) => !open),
							children: zlibOpen ? "收起 z-lib" : "z-lib 搜索下载"
						})]
					}),
					zlibOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZlibSearch, {
						onCreate: props.onCreated,
						onBusy: props.onBusy,
						setError: props.setError
					}),
					pickerOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PickerModal, {
						path,
						onClose: () => setPickerOpen(false),
						onPick: (picked) => {
							setPath(picked);
							setPickerOpen(false);
						}
					})
				]
			});
		}
		function PickerModal(props) {
			const [current, setCurrent] = (0, react.useState)(props.path === "" ? void 0 : props.path);
			const [listing, setListing] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const load = (0, react.useCallback)(async (path) => {
				try {
					const result = await api.pickerList(path);
					setListing(result);
					setError(null);
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				}
			}, []);
			(0, react.useEffect)(() => {
				load(current);
			}, [current, load]);
			const dirs = listing === null ? [] : listing.listing.entries.filter((entry) => !entry.hidden);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Book2SkillPanel_module_css_default.modalBackdrop,
				onClick: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.modal,
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.modalTitle,
							children: "选择书籍目录"
						}),
						error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.error,
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.crumbs,
							children: listing?.listing.crumbs.map((crumb) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: Book2SkillPanel_module_css_default.crumb,
								onClick: () => setCurrent(crumb.path),
								children: [crumb.name, "/"]
							}, crumb.path))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: Book2SkillPanel_module_css_default.dirList,
							children: dirs.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: Book2SkillPanel_module_css_default.dirEntry,
								onClick: () => setCurrent(entry.path),
								children: ["📁 ", entry.name]
							}) }, entry.path))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.modalActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.primaryButton,
								disabled: listing === null,
								onClick: () => {
									if (listing !== null) props.onPick(listing.listing.path);
								},
								children: "选择此目录"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.secondaryButton,
								onClick: props.onClose,
								children: "取消"
							})]
						})
					]
				})
			});
		}
		function ZlibSearch(props) {
			const [query, setQuery] = (0, react.useState)("");
			const [rows, setRows] = (0, react.useState)(null);
			const [needAuth, setNeedAuth] = (0, react.useState)(null);
			const [selected, setSelected] = (0, react.useState)(null);
			const [downloading, setDownloading] = (0, react.useState)(false);
			const search = async () => {
				if (query.trim() === "") return;
				try {
					const result = await api.zlibSearch(query.trim());
					if (result.needAuth === true) {
						setNeedAuth(result.hint ?? "需要登录");
						setRows(null);
					} else {
						setRows(result.rows ?? []);
						setNeedAuth(null);
						setSelected(null);
					}
					props.setError(null);
				} catch (error) {
					props.setError(error instanceof Error ? error.message : String(error));
				}
			};
			const download = async () => {
				if (rows === null || selected === null) return;
				const row = rows[selected];
				setDownloading(true);
				props.onBusy(true);
				try {
					const created = await api.createJob({ title: row.title });
					const result = await api.zlibDownload(created.job.id, row.download);
					props.onCreate(result.job);
				} catch (error) {
					props.setError(error instanceof Error ? error.message : String(error));
				} finally {
					setDownloading(false);
					props.onBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.zlib,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.pathRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: Book2SkillPanel_module_css_default.input,
							value: query,
							placeholder: "书名 / 作者 / ISBN",
							onChange: (event) => setQuery(event.target.value)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: Book2SkillPanel_module_css_default.primaryButton,
							onClick: () => void search(),
							children: "搜索"
						})]
					}),
					needAuth !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.warning,
						children: needAuth
					}),
					rows !== null && rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.warning,
						children: "无结果，请换关键词（英文书名 / 作者名）。"
					}),
					rows !== null && rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: Book2SkillPanel_module_css_default.zlibList,
						children: rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							className: Book2SkillPanel_module_css_default.zlibRow,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: Book2SkillPanel_module_css_default.zlibLabel,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "zlib-row",
									checked: selected === index,
									onChange: () => setSelected(index)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: Book2SkillPanel_module_css_default.zlibInfo,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Book2SkillPanel_module_css_default.zlibTitle,
										children: row.title
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Book2SkillPanel_module_css_default.zlibMeta,
										children: [
											row.author,
											" (",
											row.year,
											") · ",
											row.extension,
											" · ",
											row.filesize
										]
									})]
								})]
							})
						}, `${row.download}-${index}`))
					}),
					rows !== null && rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: Book2SkillPanel_module_css_default.primaryButton,
						disabled: selected === null || downloading,
						onClick: () => void download(),
						children: downloading ? "下载中…" : "下载并创建任务"
					})
				]
			});
		}
		function StageBody(props) {
			const { job } = props;
			if (job.status === "cancelled") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Book2SkillPanel_module_css_default.note,
				children: "任务已取消。"
			});
			if (job.status === "failed") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.note,
				children: ["任务失败：", job.error ?? "未知错误"]
			});
			switch (job.stage) {
				case 1: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stage1, { job });
				case 2: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stage2, { job });
				case 3: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stage3, {
					job,
					onApply: props.onApply,
					busy: props.busy,
					run: props.run
				});
				case 4: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stage4, {
					job,
					onApply: props.onApply,
					busy: props.busy,
					run: props.run
				});
				case 5: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stage5, {
					job,
					onApply: props.onApply,
					busy: props.busy,
					run: props.run
				});
				default: return null;
			}
		}
		function Stage1(props) {
			const { job } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Book2SkillPanel_module_css_default.stageBody,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: "获取书籍"
						}),
						job.book.path !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
							job.book.path,
							"（",
							job.book.format ?? "未解析",
							"）"
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "书籍尚未就位：在左侧输入本地路径，或 z-lib 搜索下载；也可让 agent 用 book2skill_start 工具直接创建。" }),
						job.status === "pending" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "下一步：解析分章（agent 调用 book2skill_parse，或在对话中说“解析”）"
						})
					]
				})
			});
		}
		function Stage2(props) {
			const { job } = props;
			const ocr = job.ocr;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Book2SkillPanel_module_css_default.stageBody,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: ["解析分章", job.chapters.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Book2SkillPanel_module_css_default.badge,
								children: [job.chapters.length, " 章"]
							})]
						}),
						job.status === "parsing" && ocr === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "解析中…（EPUB/文本型 PDF 很快）"
						}),
						ocr !== null && ocr.state !== "done" && ocr.state !== "idle" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.ocr,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Book2SkillPanel_module_css_default.ocrRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: ocr.queued === true ? "排队中" : ocr.state === "error" ? "OCR 出错" : `OCR 逐页识别 ${ocr.page}/${ocr.total}` })
								}),
								ocr.state !== "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Book2SkillPanel_module_css_default.progressTrack,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: Book2SkillPanel_module_css_default.progressFill,
										style: { width: `${ocr.total === 0 ? 0 : Math.min(100, ocr.page / ocr.total * 100)}%` }
									})
								}),
								ocr.message !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: Book2SkillPanel_module_css_default.hint,
									children: ocr.message
								})
							]
						}),
						job.chapters.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: Book2SkillPanel_module_css_default.chapterTree,
							children: job.chapters.map((chapter) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.chapterName,
								children: chapter.title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Book2SkillPanel_module_css_default.chapterChars,
								children: [chapter.chars, " 字"]
							})] }, chapter.file))
						}),
						job.status === "parsed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "解析完成。下一步：agent 浅读建地图，并设计 ≤3 个方向问题（门控1）。"
						})
					]
				})
			});
		}
		function Stage3(props) {
			const { job } = props;
			const summary = job.notes.findLast((note) => note.kind === "summary");
			const [draft, setDraft] = (0, react.useState)({});
			(0, react.useEffect)(() => {
				const seed = {};
				for (const answer of job.gate1.answers ?? []) seed[answer.id] = answer;
				setDraft(seed);
			}, [job.gate1.answers]);
			const submit = () => {
				if (job.gate1.status !== "open") return;
				const answers = job.gate1.questions.map((question) => draft[question.id]).filter((answer) => answer !== void 0);
				if (answers.length !== job.gate1.questions.length) return;
				props.run(async () => {
					const result = await api.answerGate1(job.id, answers);
					props.onApply(result.job);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.stageBody,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.card,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Book2SkillPanel_module_css_default.cardTitle,
						children: "浅读摘要"
					}), summary !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: Book2SkillPanel_module_css_default.pre,
						children: summary.text
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Book2SkillPanel_module_css_default.hint,
						children: "agent 正在浅读建立地图…（完成后这里显示核心方法论 / 可操作章节 / 案例分布）"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: ["门控1 · 阅读方向确认 ", job.gate1.status === "open" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.gateBadge,
								children: "等待你"
							})]
						}),
						job.gate1.status === "closed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "agent 浅读后将在这里给出 ≤3 个选择题。"
						}),
						job.gate1.questions.map((question) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.question,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Book2SkillPanel_module_css_default.questionText,
									children: question.question
								}),
								question.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Book2SkillPanel_module_css_default.questionDetail,
									children: question.detail
								}),
								question.options.map((option) => {
									const checked = draft[question.id]?.selected.includes(option.label) === true;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: Book2SkillPanel_module_css_default.option,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: question.multiSelect === true ? "checkbox" : "radio",
											name: question.id,
											checked,
											onChange: () => {
												const previous = draft[question.id]?.selected ?? [];
												const next = question.multiSelect === true ? checked ? previous.filter((label) => label !== option.label) : [...previous, option.label] : [option.label];
												setDraft((current) => ({
													...current,
													[question.id]: {
														id: question.id,
														selected: next,
														custom: draft[question.id]?.custom
													}
												}));
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Book2SkillPanel_module_css_default.optionLabel,
											children: option.label
										}), option.context !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Book2SkillPanel_module_css_default.optionContext,
											children: option.context
										})] })]
									}, option.label);
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: Book2SkillPanel_module_css_default.input,
									placeholder: "其他回答（可选，自定义答案）",
									value: draft[question.id]?.custom ?? "",
									onChange: (event) => setDraft((current) => ({
										...current,
										[question.id]: {
											id: question.id,
											selected: current[question.id]?.selected ?? [],
											custom: event.target.value
										}
									}))
								})
							]
						}, question.id)),
						job.gate1.status === "open" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: Book2SkillPanel_module_css_default.primaryButton,
							disabled: props.busy,
							onClick: submit,
							children: "提交并继续"
						}),
						job.gate1.status === "answered" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "已作答。agent 将按你的方向深读 3-5 个核心章节。在对话中继续即可。"
						})
					]
				})]
			});
		}
		function Stage4(props) {
			const { job } = props;
			const [draft, setDraft] = (0, react.useState)(job.skill.draft ?? "");
			const [dirty, setDirty] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				setDraft(job.skill.draft ?? "");
				setDirty(false);
			}, [job.skill.draft]);
			const map = job.notes.findLast((note) => note.kind === "knowledge-map");
			const checks = job.skill.selfcheck;
			const allPass = checks.length === 3 && checks.every((check) => check.pass);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Book2SkillPanel_module_css_default.stageBody,
				children: [
					map !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: "知识地图"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: Book2SkillPanel_module_css_default.pre,
							children: map.text
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Book2SkillPanel_module_css_default.cardTitle,
								children: ["SKILL.md 草稿（可编辑） ", job.gate2.status === "open" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Book2SkillPanel_module_css_default.gateBadge,
									children: "等待你"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: Book2SkillPanel_module_css_default.textarea,
								value: draft,
								onChange: (event) => {
									setDraft(event.target.value);
									setDirty(true);
								},
								spellCheck: false
							}),
							dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Book2SkillPanel_module_css_default.formActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: Book2SkillPanel_module_css_default.secondaryButton,
									disabled: props.busy,
									onClick: () => void props.run(async () => {
										const result = await api.saveDraft(job.id, draft);
										props.onApply(result.job);
									}),
									children: "保存修改"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: Book2SkillPanel_module_css_default.linkButton,
									onClick: () => setDraft(job.skill.draft ?? ""),
									children: "放弃修改"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Book2SkillPanel_module_css_default.cardTitle,
								children: "3 项自检清单"
							}),
							checks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Book2SkillPanel_module_css_default.hint,
								children: "agent 生成草稿后会逐项自检：SOP 可溯源 / 索引准确 / 触发词宽窄。"
							}),
							checks.map((check) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: check.pass ? Book2SkillPanel_module_css_default.checkPass : Book2SkillPanel_module_css_default.checkFail,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Book2SkillPanel_module_css_default.checkMark,
										children: check.pass ? "✓" : "✗"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Book2SkillPanel_module_css_default.checkTitle,
										children: check.title
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Book2SkillPanel_module_css_default.checkNote,
										children: check.note
									})
								]
							}, check.id))
						]
					}),
					job.gate2.status === "open" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Book2SkillPanel_module_css_default.formActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.secondaryButton,
								disabled: props.busy,
								onClick: () => void props.run(async () => {
									const result = await api.decideGate2(job.id, "regenerate", dirty ? draft : void 0);
									props.onApply(result.job);
								}),
								children: "重新生成"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.primaryButton,
								disabled: props.busy,
								onClick: () => void props.run(async () => {
									const result = await api.decideGate2(job.id, "pass", dirty ? draft : void 0);
									props.onApply(result.job);
								}),
								children: "通过并继续"
							}),
							!allPass && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.hint,
								children: "存在未通过的自检项；点“重新生成”会让 agent 修复，或直接通过。"
							})
						]
					}),
					job.gate2.status === "decided" && job.gate2.verdict === "regenerate" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Book2SkillPanel_module_css_default.hint,
						children: "已要求 agent 重新生成。在对话中继续即可。"
					})
				]
			});
		}
		function Stage5(props) {
			const { job } = props;
			const labels = job.targetLabels ?? {
				claude: "~/.claude/skills",
				codex: "~/.codex/skills",
				kk_skill: "~/kk_skill/skills"
			};
			const [targets, setTargets] = (0, react.useState)(job.install.targets);
			(0, react.useEffect)(() => {
				setTargets(job.install.targets);
			}, [job.install.targets]);
			const toggle = (target) => {
				const next = targets.includes(target) ? targets.filter((item) => item !== target) : [...targets, target];
				setTargets(next);
				api.setTargets(job.id, next).catch(() => {});
			};
			const installed = job.install.result;
			const triggerNote = job.notes.findLast((note) => note.title === "触发示例" || note.kind === "other" && note.title.includes("触发"));
			let chips = [];
			if (triggerNote !== void 0) try {
				const parsed = JSON.parse(triggerNote.text);
				if (Array.isArray(parsed)) chips = parsed.map((item) => String(item));
			} catch {
				chips = [];
			}
			if (chips.length === 0) chips = [`用《${job.title ?? "这本书"}》的方法帮我分析…`, job.skill.name ?? ""].filter((chip) => chip !== "");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Book2SkillPanel_module_css_default.stageBody,
				children: installed === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: ["门控3 · 安装目标（多选） ", job.status === "awaiting_gate3" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.gateBadge,
								children: "等待你"
							})]
						}),
						[
							"claude",
							"codex",
							"kk_skill"
						].map((target) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: Book2SkillPanel_module_css_default.option,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: targets.includes(target),
								onChange: () => toggle(target)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.optionLabel,
								children: labels[target] ?? target
							}), target === "kk_skill" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Book2SkillPanel_module_css_default.optionContext,
								children: "写入 kk_skill 同步仓库（每天 05:00 或手动 sync 推送）"
							})] })]
						}, target)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.formActions,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.primaryButton,
								disabled: props.busy || targets.length === 0,
								onClick: () => void props.run(async () => {
									const result = await api.confirmInstall(job.id);
									props.onApply(result.job);
								}),
								children: "确认安装"
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "确认后 agent 调用 book2skill_install 执行复制；目标目录已存在同名 skill 时需要 agent 覆盖确认。"
						})
					]
				}) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Book2SkillPanel_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: Book2SkillPanel_module_css_default.celebrate,
							src: "/book2skill/assets/celebrate.svg",
							alt: "完成"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: "安装完成"
						}),
						installed.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: item.ok ? Book2SkillPanel_module_css_default.checkPass : Book2SkillPanel_module_css_default.checkFail,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Book2SkillPanel_module_css_default.checkMark,
									children: item.ok ? "✓" : "✗"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Book2SkillPanel_module_css_default.checkTitle,
									children: labels[item.target] ?? item.target
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: Book2SkillPanel_module_css_default.checkNote,
									children: [item.path, item.error === void 0 ? "" : `（${item.error}）`]
								})
							]
						}, item.target)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.cardTitle,
							children: "触发示例"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Book2SkillPanel_module_css_default.chips,
							children: chips.map((chip) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: Book2SkillPanel_module_css_default.chip,
								onClick: () => {
									navigator.clipboard.writeText(chip).then(() => {});
								},
								title: "点击复制到剪贴板，粘贴到对话即可试一下",
								children: chip
							}, chip))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Book2SkillPanel_module_css_default.hint,
							children: "立即试一下：复制任意触发语，粘贴到对话发送（新会话效果最佳；Claude Code 需 /reload 生效）。"
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: the slot registry (view tab host is ui-conversation). */
		const inject = ["slots"];
		function apply(ctx) {
			const cordisCtx = ctx;
			cordisCtx.slots.inject("conversation.view", () => cordisCtx.slots.register({
				name: "conversation.view",
				id: "book2skill",
				order: 1,
				label: () => "书籍转技能",
				inject: () => ({})
			}, Book2SkillPanel));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map