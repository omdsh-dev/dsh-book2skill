/**
 * Panel RPC: plain same-origin fetches against the /book2skill route
 * prefix. Every response is JSON; non-ok bodies still parse and carry a
 * `code`/`message` pair the UI can surface.
 * @module
 */
export interface PanelJob {
    id: string;
    status: string;
    stage: number;
    title?: string;
    book: {
        kind: string;
        path?: string;
        url?: string;
        title?: string;
        format?: string;
    };
    chapters: Array<{
        file: string;
        title: string;
        chars: number;
    }>;
    toc?: string;
    ocr: {
        state: string;
        page: number;
        total: number;
        message?: string;
        queued?: boolean;
    } | null;
    notes: Array<{
        kind: string;
        title: string;
        text: string;
        at: string;
    }>;
    gate1: {
        status: string;
        questions: GateQuestionView[];
        answers?: GateAnswerView[];
    };
    skill: {
        name?: string;
        draft?: string;
        selfcheck: SelfCheckView[];
    };
    gate2: {
        status: string;
        verdict?: 'pass' | 'regenerate';
    };
    install: {
        targets: string[];
        confirmed?: boolean;
        result?: InstallResultView[];
    };
    error?: string;
    firstChapter?: {
        file: string;
        title: string;
        chars: number;
    };
    targetLabels: Record<string, string>;
    bookPath?: string;
}
export interface GateQuestionView {
    id: string;
    question: string;
    detail?: string;
    options: Array<{
        label: string;
        context: string;
    }>;
    multiSelect?: boolean;
}
export interface GateAnswerView {
    id: string;
    selected: string[];
    custom?: string;
}
export interface SelfCheckView {
    id: 'traceability' | 'index' | 'triggers';
    title: string;
    pass: boolean;
    note: string;
}
export interface InstallResultView {
    target: string;
    path: string;
    ok: boolean;
    error?: string;
}
export interface JobListRow {
    id: string;
    status: string;
    stage: number;
    title: string;
    createdAt: string;
    updatedAt: string;
}
export interface DirectoryListing {
    path: string;
    home: string;
    crumbs: Array<{
        name: string;
        path: string;
    }>;
    entries: Array<{
        name: string;
        path: string;
        hidden: boolean;
    }>;
    truncated: boolean;
}
export interface ZlibRow {
    title: string;
    author: string;
    year: string;
    extension: string;
    filesize: string;
    download: string;
    href: string;
}
export declare const api: {
    listJobs: () => Promise<{
        ok: true;
        jobs: JobListRow[];
    }>;
    getJob: (jobId: string) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    createJob: (input: {
        bookPath?: string;
        title?: string;
    }) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    cancel: (jobId: string) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    saveDraft: (jobId: string, draft: string) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    answerGate1: (jobId: string, answers: GateAnswerView[]) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    decideGate2: (jobId: string, verdict: "pass" | "regenerate", draft?: string) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    setTargets: (jobId: string, targets: string[]) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    confirmInstall: (jobId: string) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
    pickerList: (path?: string) => Promise<{
        ok: true;
        listing: DirectoryListing;
    }>;
    zlibSearch: (query: string) => Promise<{
        ok: boolean;
        needAuth?: boolean;
        rows?: ZlibRow[];
        error?: string;
        hint?: string;
    }>;
    zlibDownload: (jobId: string, downloadPath: string) => Promise<{
        ok: true;
        job: PanelJob;
    }>;
};
