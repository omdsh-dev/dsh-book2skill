/**
 * dsh-book2skill host half (cordis plugin body).
 *
 * Owns the book2skill storage domain (durable jobs, cross-session resume),
 * the /book2skill HTTP surface the browser panel consumes, and the agent
 * tools (start/parse/notes/install/…). Everything here is host-plane: the
 * storage-domain facility is a process singleton routed to the deployment's
 * backend, and the routes answer same-origin fetches of the client half.
 *
 * OCR decoupling: no `paddleOcr` injection — the probe is per-call and a
 * missing dsh-paddle-ocr service degrades to a direct HTTP call with an
 * explicit status message (see ocr.ts).
 *
 * Export shape: function/namespace plugin (name/inject/apply, NO default —
 * a stray `export default` would collapse the module via the Loader's
 * unwrapExports and drop `inject`).
 * @module dsh-book2skill
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-book2skill";
/**
 * storageDomain: durable jobs; tools: agent tools; webServer: panel routes;
 * shell: python parser subprocesses; web: OCR/z-lib fetches; directoryPicker:
 * the panel's directory browsing.
 */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
