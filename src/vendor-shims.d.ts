/**
 * Minimal ambient declarations for the optional OCR seam only. Every other
 * host/client service type comes from the real @deepseek-ai/* packages,
 * which the setup-dsh-workspace script links into node_modules for both
 * typechecking and host runtime resolution (the longbridge posture).
 *
 * The OCR seam: `paddleOcr` is an OPTIONAL service provided by the
 * dsh-paddle-ocr host plugin. dsh-book2skill deliberately does NOT inject
 * it (a missing service would hold this row pending forever); it probes
 * `ctx.get('paddleOcr')` at call time and falls back to a direct HTTP call
 * with a clear status message when the service is absent.
 */

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Optional OCR backend (dsh-paddle-ocr). Absent unless installed. */
    paddleOcr?: PaddleOcrService
  }
}

/** Contract dsh-book2skill expects from the dsh-paddle-ocr host plugin. */
export interface PaddleOcrService {
  /**
   * Parse a scanned PDF page by page into markdown files under `outputDir`.
   * Progress reports ride the callback; the returned promise settles with
   * the produced page count.
   */
  parsePdf(
    pdfPath: string,
    options: {
      outputDir: string
      onProgress?: (progress: { page: number; total: number; state: 'running' | 'queued' | 'done'; message?: string }) => void
      signal?: AbortSignal
    },
  ): Promise<{ pages: number; files: string[] }>
}
