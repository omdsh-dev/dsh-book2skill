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
 * @module @dsh-external/dsh-book2skill
 */
import { Book2SkillService } from "./service.js";
import { registerBook2SkillRoutes } from "./routes.js";
import { registerBook2SkillTools } from "./tools.js";
export const name = 'dsh-book2skill';
/**
 * storageDomain: durable jobs; tools: agent tools; webServer: panel routes;
 * shell: python parser subprocesses; web: OCR/z-lib fetches; directoryPicker:
 * the panel's directory browsing.
 */
export const inject = ['storageDomain', 'tools', 'webServer', 'shell', 'web', 'directoryPicker'];
export function apply(ctx) {
    const service = new Book2SkillService(ctx);
    const toolDisposers = registerBook2SkillTools(service);
    ctx.effect(() => () => {
        for (const dispose of toolDisposers)
            dispose();
    }, 'dsh-book2skill: tool registrations');
    const routeDisposer = registerBook2SkillRoutes(service);
    ctx.effect(() => () => routeDisposer(), 'dsh-book2skill: panel routes');
    ctx.effect(() => () => {
        void service.close();
    }, 'dsh-book2skill: domain close');
}
