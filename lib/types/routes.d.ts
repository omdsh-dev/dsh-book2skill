/**
 * HTTP surface for the browser panel. External plugins cannot extend the
 * core `/api` RPC map, so this plugin serves its own same-origin routes and
 * the panel consumes them with plain fetch (the daily-progress posture).
 *
 * Route tree (mounted at prefix `/book2skill`):
 *   GET  /book2skill/jobs                     → job list rows
 *   GET  /book2skill/jobs/:id                 → full panel snapshot
 *   POST /book2skill/jobs                     → create job (local path)
 *   POST /book2skill/jobs/:id/cancel
 *   POST /book2skill/jobs/:id/gate1/answer    → gate 1 answers
 *   POST /book2skill/jobs/:id/gate2/decision  → pass / regenerate (+edited draft)
 *   POST /book2skill/jobs/:id/gate3/targets   → target selection
 *   POST /book2skill/jobs/:id/gate3/confirm   → confirm targets (gate 3)
 *   GET  /book2skill/picker/list?path=        → directory listing (browse capability)
 *   POST /book2skill/zlib/search              → z-lib search
 *   POST /book2skill/zlib/download            → z-lib download into job
 *   GET  /book2skill/assets/:name             → bundled SVG assets
 *
 * All handlers are loopback-guarded (the Host header must be loopback).
 * @module @dsh-external/dsh-book2skill/routes
 */
import type { Book2SkillService } from './service.ts';
export declare function registerBook2SkillRoutes(service: Book2SkillService): () => void;
