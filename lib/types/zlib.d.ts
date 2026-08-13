/**
 * z-lib search/download adapter (best effort, no hardcoded secrets).
 *
 * Login state rides the user's existing book-downloader skill cookies
 * (~/.claude/skills/book-downloader/auth/zlib-cookies.json); when absent
 * the endpoints answer a structured `needAuth` result and the panel shows
 * the fallback guidance (local path, or run the book-downloader skill to
 * log in first). Transfers go through curl (headers + binary support),
 * converting the Playwright cookie JSON into a Netscape cookie jar on the
 * fly — nothing is embedded and nothing is written to the repo.
 * @module @dsh-external/dsh-book2skill/zlib
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const ZLIB_BASE = "https://zh.z-lib.sk";
export declare const ZLIB_COOKIE_FILE: string;
export interface ZlibBookRow {
    title: string;
    author: string;
    year: string;
    extension: string;
    filesize: string;
    download: string;
    href: string;
}
export interface ZlibSearchResult {
    ok: boolean;
    needAuth?: boolean;
    rows?: ZlibBookRow[];
    error?: string;
    hint?: string;
}
/** Search z-lib. Returns `needAuth` when no cookie file exists. */
export declare function searchZlib(ctx: Context, query: string, signal?: AbortSignal): Promise<ZlibSearchResult>;
/** Download one book by its /dl/<token> path into `destFile`. */
export declare function downloadZlib(ctx: Context, downloadPath: string, destFile: string, signal?: AbortSignal): Promise<{
    ok: boolean;
    path?: string;
    error?: string;
}>;
