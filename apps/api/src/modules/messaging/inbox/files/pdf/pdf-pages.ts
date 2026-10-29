import { PDF_PREVIEW_PAGES } from '@ab/shared';

// The pure part of the chat PDF preview (owner 2026-10-29): which pages one request renders, poppler's
// arguments and outputs, and two per-process maps (shared in-flight work, recent failures).

/** Pages 2+ render in runs of this many (2–6, 7–11 …), so page 2 never waits for page 30. */
export const PDF_RUN = 5;
/** A crafted «Pages: 99999999999» is stored as this many: never a column overflow, a 500 and a probe per view. */
const PDF_PAGES_MAX = 100_000;

export type PageRange = { first: number; last: number };

/** Page 1 alone (the bubble's thumb), else the run of PDF_RUN it falls in, cut at the page count and PDF_PREVIEW_PAGES. */
export function pageRange(page: number, pages: number): PageRange {
  if (page === 1) return { first: 1, last: 1 };
  const first = 2 + Math.floor((page - 2) / PDF_RUN) * PDF_RUN;
  return { first, last: Math.min(first + PDF_RUN - 1, pages, PDF_PREVIEW_PAGES) };
}

/**
 * «Pages:          12» of pdfinfo's report, at most PDF_PAGES_MAX; 0 when it has none. The LAST such
 * line: the file's own strings (Title, Author …, a newline inside them printed as is) come before it,
 * only poppler's lines (Encrypted, Page size …) after, so a crafted «\nPages: 1» in a Title never wins.
 */
export function pdfinfoPages(stdout: string): number {
  const m = [...stdout.matchAll(/^Pages:\s+(\d+)$/gm)].at(-1);
  return m ? Math.min(Number(m[1]), PDF_PAGES_MAX) : 0;
}

/**
 * JPEG at quality 70, the long side scaled to 1600 px (an A4 page ≈ 1131×1600, 150–300 KB), pages
 * `range` only. The smoke render in apps/api/Dockerfile runs these same flags: change both together.
 */
export function pdftoppmArgs(input: { pdf: string; outRoot: string; range: PageRange }): string[] {
  const { first, last } = input.range;
  return ['-jpeg', '-jpegopt', 'quality=70', '-scale-to', '1600', '-f', String(first), '-l', String(last), input.pdf, input.outRoot];
}

/** «p-07.jpg» → 7: pdftoppm pads the number to the digits of the page count, so names are parsed, never built. */
export function pageOfFile(name: string): number | null {
  const m = /^p-(\d+)\.jpg$/.exec(name);
  return m ? Number(m[1]) : null;
}

/** One running promise per key, shared by every caller meanwhile, forgotten once it settles. */
export class InFlight<T> {
  private readonly running = new Map<string, Promise<T>>();

  run(key: string, fn: () => Promise<T>): Promise<T> {
    const known = this.running.get(key);
    if (known) return known;
    const job = fn().finally(() => this.running.delete(key));
    this.running.set(key, job);
    return job;
  }
}

/** Keys that failed within `ms`: a PDF whose render always fails or hangs does not take the slot on every view. */
export class FailedRecently {
  private readonly until = new Map<string, number>();

  constructor(
    private readonly ms: number,
    private readonly now: () => number = Date.now,
  ) {}

  has(key: string): boolean {
    return (this.until.get(key) ?? 0) > this.now();
  }

  add(key: string): void {
    const now = this.now();
    for (const [k, t] of this.until) if (t <= now) this.until.delete(k);
    this.until.set(key, now + this.ms);
  }
}
