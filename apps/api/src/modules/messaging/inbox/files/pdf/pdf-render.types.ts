import type { PopplerTool } from './pdf.schemas';

/**
 * How a run ended: the exit code (null when killed), the start of stdout, and whether our timeout
 * killed it.
 */
export interface PdfExit {
  code: number | null;
  stdout: string;
  timedOut: boolean;
}

/**
 * Runs a poppler tool on files in a temp folder; rejects (PdfToolError 'failed') only when it
 * cannot start.
 */
export type PdfRun = (tool: PopplerTool, args: readonly string[]) => Promise<PdfExit>;

export interface PdfPageImage {
  page: number;
  jpg: Uint8Array;
}
