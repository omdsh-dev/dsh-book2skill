/**
 * Durable domain declaration: one `jobs` table keyed by job id. Rides the
 * host's storage-domain facility (`ctx.storageDomain`), routed to whatever
 * backend the deployment configured (the standard web composition: json
 * under $DSH_HOME/storages), so jobs survive restarts and cross-session
 * resume.
 *
 * Note: the spec is cast through `never` because this standalone repository
 * carries its own zod instance while the host's storage-domain package
 * references the host's zod; the runtime contract is structural (name +
 * tables + value schemas), and the zod object this module builds is the
 * very schema the domain facility validates against.
 * @module dsh-book2skill/domain
 */
import z from 'zod';
export declare const Book2SkillJobSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodString;
    stage: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    book: z.ZodObject<{
        kind: z.ZodEnum<["local", "zlib"]>;
        path: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        title: z.ZodOptional<z.ZodString>;
        format: z.ZodOptional<z.ZodEnum<["epub", "pdf", "other"]>>;
    }, "strip", z.ZodTypeAny, {
        kind: "local" | "zlib";
        path?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        format?: "epub" | "pdf" | "other" | undefined;
    }, {
        kind: "local" | "zlib";
        path?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        format?: "epub" | "pdf" | "other" | undefined;
    }>;
    parse: z.ZodObject<{
        kind: z.ZodOptional<z.ZodEnum<["epub", "pdf-text", "pdf-ocr"]>>;
        outDir: z.ZodOptional<z.ZodString>;
        chapters: z.ZodDefault<z.ZodArray<z.ZodObject<{
            file: z.ZodString;
            title: z.ZodString;
            chars: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            title: string;
            file: string;
            chars: number;
        }, {
            title: string;
            file: string;
            chars: number;
        }>, "many">>;
        toc: z.ZodOptional<z.ZodString>;
        pdfPages: z.ZodOptional<z.ZodNumber>;
        ocr: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            state: z.ZodEnum<["idle", "running", "queued", "done", "error"]>;
            page: z.ZodNumber;
            total: z.ZodNumber;
            message: z.ZodOptional<z.ZodString>;
            queued: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            state: "idle" | "running" | "queued" | "done" | "error";
            page: number;
            total: number;
            message?: string | undefined;
            queued?: boolean | undefined;
        }, {
            state: "idle" | "running" | "queued" | "done" | "error";
            page: number;
            total: number;
            message?: string | undefined;
            queued?: boolean | undefined;
        }>>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        chapters: {
            title: string;
            file: string;
            chars: number;
        }[];
        ocr: {
            state: "idle" | "running" | "queued" | "done" | "error";
            page: number;
            total: number;
            message?: string | undefined;
            queued?: boolean | undefined;
        } | null;
        kind?: "epub" | "pdf-text" | "pdf-ocr" | undefined;
        error?: string | undefined;
        outDir?: string | undefined;
        toc?: string | undefined;
        pdfPages?: number | undefined;
    }, {
        kind?: "epub" | "pdf-text" | "pdf-ocr" | undefined;
        error?: string | undefined;
        outDir?: string | undefined;
        chapters?: {
            title: string;
            file: string;
            chars: number;
        }[] | undefined;
        toc?: string | undefined;
        pdfPages?: number | undefined;
        ocr?: {
            state: "idle" | "running" | "queued" | "done" | "error";
            page: number;
            total: number;
            message?: string | undefined;
            queued?: boolean | undefined;
        } | null | undefined;
    }>;
    gate1: z.ZodObject<{
        status: z.ZodEnum<["closed", "open", "answered"]>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            question: z.ZodString;
            detail: z.ZodOptional<z.ZodString>;
            options: z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                context: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                label: string;
                context: string;
            }, {
                label: string;
                context: string;
            }>, "many">;
            multiSelect: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            options: {
                label: string;
                context: string;
            }[];
            id: string;
            question: string;
            detail?: string | undefined;
            multiSelect?: boolean | undefined;
        }, {
            options: {
                label: string;
                context: string;
            }[];
            id: string;
            question: string;
            detail?: string | undefined;
            multiSelect?: boolean | undefined;
        }>, "many">>;
        answers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            selected: z.ZodArray<z.ZodString, "many">;
            custom: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            selected: string[];
            custom?: string | undefined;
        }, {
            id: string;
            selected: string[];
            custom?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        status: "closed" | "open" | "answered";
        questions: {
            options: {
                label: string;
                context: string;
            }[];
            id: string;
            question: string;
            detail?: string | undefined;
            multiSelect?: boolean | undefined;
        }[];
        answers?: {
            id: string;
            selected: string[];
            custom?: string | undefined;
        }[] | undefined;
    }, {
        status: "closed" | "open" | "answered";
        questions?: {
            options: {
                label: string;
                context: string;
            }[];
            id: string;
            question: string;
            detail?: string | undefined;
            multiSelect?: boolean | undefined;
        }[] | undefined;
        answers?: {
            id: string;
            selected: string[];
            custom?: string | undefined;
        }[] | undefined;
    }>;
    notes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<["summary", "knowledge-map", "deep-read", "draft", "selfcheck", "questions", "other"]>;
        title: z.ZodString;
        text: z.ZodString;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "other" | "questions" | "summary" | "knowledge-map" | "deep-read" | "draft" | "selfcheck";
        at: string;
        title: string;
        text: string;
    }, {
        kind: "other" | "questions" | "summary" | "knowledge-map" | "deep-read" | "draft" | "selfcheck";
        at: string;
        title: string;
        text: string;
    }>, "many">>;
    skill: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        draft: z.ZodOptional<z.ZodString>;
        selfcheck: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodEnum<["traceability", "index", "triggers"]>;
            title: z.ZodString;
            pass: z.ZodBoolean;
            note: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            title: string;
            id: "traceability" | "index" | "triggers";
            pass: boolean;
            note: string;
        }, {
            title: string;
            id: "traceability" | "index" | "triggers";
            pass: boolean;
            note: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        selfcheck: {
            title: string;
            id: "traceability" | "index" | "triggers";
            pass: boolean;
            note: string;
        }[];
        draft?: string | undefined;
        name?: string | undefined;
    }, {
        draft?: string | undefined;
        selfcheck?: {
            title: string;
            id: "traceability" | "index" | "triggers";
            pass: boolean;
            note: string;
        }[] | undefined;
        name?: string | undefined;
    }>;
    gate2: z.ZodObject<{
        status: z.ZodEnum<["closed", "open", "decided"]>;
        verdict: z.ZodOptional<z.ZodEnum<["pass", "regenerate"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "closed" | "open" | "decided";
        verdict?: "pass" | "regenerate" | undefined;
    }, {
        status: "closed" | "open" | "decided";
        verdict?: "pass" | "regenerate" | undefined;
    }>;
    install: z.ZodObject<{
        targets: z.ZodDefault<z.ZodArray<z.ZodEnum<["claude", "codex", "kk_skill"]>, "many">>;
        confirmed: z.ZodOptional<z.ZodBoolean>;
        result: z.ZodOptional<z.ZodArray<z.ZodObject<{
            target: z.ZodEnum<["claude", "codex", "kk_skill"]>;
            path: z.ZodString;
            ok: z.ZodBoolean;
            error: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            target: "claude" | "codex" | "kk_skill";
            ok: boolean;
            error?: string | undefined;
        }, {
            path: string;
            target: "claude" | "codex" | "kk_skill";
            ok: boolean;
            error?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        targets: ("claude" | "codex" | "kk_skill")[];
        confirmed?: boolean | undefined;
        result?: {
            path: string;
            target: "claude" | "codex" | "kk_skill";
            ok: boolean;
            error?: string | undefined;
        }[] | undefined;
    }, {
        targets?: ("claude" | "codex" | "kk_skill")[] | undefined;
        confirmed?: boolean | undefined;
        result?: {
            path: string;
            target: "claude" | "codex" | "kk_skill";
            ok: boolean;
            error?: string | undefined;
        }[] | undefined;
    }>;
    error: z.ZodOptional<z.ZodString>;
    cancelledAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    stage: number;
    createdAt: string;
    updatedAt: string;
    book: {
        kind: "local" | "zlib";
        path?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        format?: "epub" | "pdf" | "other" | undefined;
    };
    parse: {
        chapters: {
            title: string;
            file: string;
            chars: number;
        }[];
        ocr: {
            state: "idle" | "running" | "queued" | "done" | "error";
            page: number;
            total: number;
            message?: string | undefined;
            queued?: boolean | undefined;
        } | null;
        kind?: "epub" | "pdf-text" | "pdf-ocr" | undefined;
        error?: string | undefined;
        outDir?: string | undefined;
        toc?: string | undefined;
        pdfPages?: number | undefined;
    };
    gate1: {
        status: "closed" | "open" | "answered";
        questions: {
            options: {
                label: string;
                context: string;
            }[];
            id: string;
            question: string;
            detail?: string | undefined;
            multiSelect?: boolean | undefined;
        }[];
        answers?: {
            id: string;
            selected: string[];
            custom?: string | undefined;
        }[] | undefined;
    };
    notes: {
        kind: "other" | "questions" | "summary" | "knowledge-map" | "deep-read" | "draft" | "selfcheck";
        at: string;
        title: string;
        text: string;
    }[];
    skill: {
        selfcheck: {
            title: string;
            id: "traceability" | "index" | "triggers";
            pass: boolean;
            note: string;
        }[];
        draft?: string | undefined;
        name?: string | undefined;
    };
    gate2: {
        status: "closed" | "open" | "decided";
        verdict?: "pass" | "regenerate" | undefined;
    };
    install: {
        targets: ("claude" | "codex" | "kk_skill")[];
        confirmed?: boolean | undefined;
        result?: {
            path: string;
            target: "claude" | "codex" | "kk_skill";
            ok: boolean;
            error?: string | undefined;
        }[] | undefined;
    };
    error?: string | undefined;
    cancelledAt?: string | undefined;
}, {
    status: string;
    id: string;
    stage: number;
    createdAt: string;
    updatedAt: string;
    book: {
        kind: "local" | "zlib";
        path?: string | undefined;
        url?: string | undefined;
        title?: string | undefined;
        format?: "epub" | "pdf" | "other" | undefined;
    };
    parse: {
        kind?: "epub" | "pdf-text" | "pdf-ocr" | undefined;
        error?: string | undefined;
        outDir?: string | undefined;
        chapters?: {
            title: string;
            file: string;
            chars: number;
        }[] | undefined;
        toc?: string | undefined;
        pdfPages?: number | undefined;
        ocr?: {
            state: "idle" | "running" | "queued" | "done" | "error";
            page: number;
            total: number;
            message?: string | undefined;
            queued?: boolean | undefined;
        } | null | undefined;
    };
    gate1: {
        status: "closed" | "open" | "answered";
        questions?: {
            options: {
                label: string;
                context: string;
            }[];
            id: string;
            question: string;
            detail?: string | undefined;
            multiSelect?: boolean | undefined;
        }[] | undefined;
        answers?: {
            id: string;
            selected: string[];
            custom?: string | undefined;
        }[] | undefined;
    };
    skill: {
        draft?: string | undefined;
        selfcheck?: {
            title: string;
            id: "traceability" | "index" | "triggers";
            pass: boolean;
            note: string;
        }[] | undefined;
        name?: string | undefined;
    };
    gate2: {
        status: "closed" | "open" | "decided";
        verdict?: "pass" | "regenerate" | undefined;
    };
    install: {
        targets?: ("claude" | "codex" | "kk_skill")[] | undefined;
        confirmed?: boolean | undefined;
        result?: {
            path: string;
            target: "claude" | "codex" | "kk_skill";
            ok: boolean;
            error?: string | undefined;
        }[] | undefined;
    };
    error?: string | undefined;
    notes?: {
        kind: "other" | "questions" | "summary" | "knowledge-map" | "deep-read" | "draft" | "selfcheck";
        at: string;
        title: string;
        text: string;
    }[] | undefined;
    cancelledAt?: string | undefined;
}>;
/** The domain spec: one `jobs` table holding one record per job id. */
export declare const book2skillDomain: never;
export type Book2SkillDomainSpec = typeof book2skillDomain;
