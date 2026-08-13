/**
 * OCR adapter with three tiers, probed at call time (no hard dependency):
 *
 *  1. `paddleOcr` host service        — the dsh-paddle-ocr plugin's future
 *     published service (contract in vendor-shims.d.ts).
 *  2. `/paddle-ocr` loopback RPC      — the installed dsh-paddle-ocr
 *     plugin's panel task channel (task/start → task/status poll →
 *     task/commit), driven over the documented wire envelope.
 *  3. Direct HTTP endpoint            — a standalone OCR stub
 *     (BOOK2SKILL_OCR_ENDPOINT, default http://127.0.0.1:8011/api/pdf/ocr).
 *
 * Every degraded run records a clear `state`/`message` on the job so the
 * panel shows exactly what happened (排队中 / 逐页进度 / 不可用).
 * @module dsh-book2skill/ocr
 */
import type { Context } from '@deepseek-ai/cordis';
import type { OcrProgress } from './types.ts';
/** Default HTTP endpoint for the standalone OCR stub (dsh-paddle-ocr's HTTP mode). */
export declare const DEFAULT_OCR_ENDPOINT = "http://127.0.0.1:8011/api/pdf/ocr";
export type OcrProgressSink = (progress: OcrProgress) => void;
/**
 * Run OCR over a scanned PDF into per-page markdown files.
 * @returns the produced page count and file list.
 */
export declare function ocrPdf(ctx: Context, pdfPath: string, outputDir: string, totalPages: number, report: OcrProgressSink, signal?: AbortSignal): Promise<{
    pages: number;
    files: string[];
}>;
