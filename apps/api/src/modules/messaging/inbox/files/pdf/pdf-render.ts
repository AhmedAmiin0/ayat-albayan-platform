import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inTempDir } from '@/modules/messaging/inbox/files/temp-dir';
import { z } from 'zod';
import { pageOfFile, pdfinfoPages, pdftoppmArgs, type PageRange } from './pdf-pages';
import { popplerToolSchema, type PdfFailure, type PopplerTool } from './pdf.schemas';

/** How a run ended: exit code (null when killed), the start of stdout, killed by our timeout. */
export interface PdfExit {
  code: number | null;
  stdout: string;
  timedOut: boolean;
}
/** Runs a poppler tool on temp files; rejects (PdfToolError 'failed') only when it cannot start. */
export type PdfRun = (tool: PopplerTool, args: readonly string[]) => Promise<PdfExit>;
export interface PdfPageImage {
  page: number;
  jpg: Uint8Array;
}

/**
 * 'busy': the render queue is full, try again; 'failed': the tool crashed, hung or could not
 * start (not stored);
 * 'unavailable': no PDF sandbox to ask (pdf-client.ts: local dev, tests, CI, ayat-pdf restarting).
 */
export class PdfToolError extends Error {
  constructor(readonly reason: PdfFailure) {
    super(`pdf preview ${reason}`);
  }
}

// Calibration knobs (docs/09: measure with a scanned 10 MB PDF on staging).
const TIMEOUT_MS = z
  .record(popplerToolSchema, z.number())
  .readonly()
  .decode({ pdfinfo: 5_000, pdftoppm: 20_000 });
/**
 * Address space per run: a crafted page fails its own malloc, never the sandbox's node. A resource
 * limit like nice, choom and the timeout; the isolation is the container (docs/09 «PDF sandbox»):
 * this runs only in ayat-pdf (pdf-sandbox.ts), never in an API copy (pdf-client.ts).
 */
const AS_BYTES = 256 * 1024 * 1024;
const SANDBOX = ['-n', '10', 'choom', '-n', '1000', '--', 'prlimit'];
/** stdout kept per run; a pdfinfo report this long (padded Title) may have lost «Pages:». */
const STDOUT_MAX = 64 * 1024;
/** pdfinfo cannot open (1: broken or a user password) or refuses (3) the file: never previews. */
const NEVER_OPENS = new Set([1, 3]);
/** One render per process (API copy, ayat-pdf); this many may wait, the next is 'busy'. */
const QUEUE_MAX = 8;

/**
 * The image's poppler-utils (apps/api/Dockerfile) as uid node, through `nice` (API requests go
 * first), `choom -n 1000` (under memory pressure the kernel kills the tool, not node) and
 * `prlimit --as`; no stdin or stderr, PATH alone, SIGKILLed after TIMEOUT_MS. `child.killed` is set
 * only by that kill: an outside kill (OOM killer, address-space cap) is a crash, not a hang.
 */
const spawnPoppler: PdfRun = (tool, args) =>
  new Promise((resolve, reject) => {
    const argv = [...SANDBOX, `--as=${AS_BYTES}`, '--', tool, ...args];
    const child = spawn('/usr/bin/nice', argv, {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { PATH: '/usr/bin:/bin' },
      timeout: TIMEOUT_MS[tool],
      killSignal: 'SIGKILL',
    });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (s: string) => {
      if (stdout.length < STDOUT_MAX) stdout += s;
    });
    child.once('error', () => reject(new PdfToolError('failed')));
    child.once('close', (code) => resolve({ code, stdout, timedOut: child.killed }));
  });

let running = false;
const waiting: (() => void)[] = [];

/**
 * `fn` alone in this process: one PDF in flight per API copy, one poppler run in ayat-pdf. The
 * caller takes the slot before reading the PDF (storage, socket), so a waiting one holds none.
 */
export async function inSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running) {
    if (waiting.length >= QUEUE_MAX) throw new PdfToolError('busy');
    await new Promise<void>((go) => waiting.push(go));
  }
  running = true;
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running = false;
  }
}

/** The PDF in a temp folder (removed afterwards, whatever happens), for one tool run. */
const withPdf = <T>(bytes: Uint8Array, fn: (pdf: string, dir: string) => Promise<T>): Promise<T> =>
  inTempDir('pdf-', async (dir) => {
    const pdf = join(dir, 'in.pdf');
    await writeFile(pdf, bytes);
    return fn(pdf, dir);
  });

/**
 * The page count, or 0 = a permanent «no preview»: pdfinfo cannot open it (1, also encrypted),
 * refuses it (3), hangs (5 s is pathological) or prints STDOUT_MAX or more (cut, so its count
 * cannot be trusted). Any other end (99, a crash, the memory cap) may pass next time:
 * PdfToolError('failed'), nothing stored.
 */
export function pdfPageCount(bytes: Uint8Array, run: PdfRun = spawnPoppler): Promise<number> {
  return withPdf(bytes, async (pdf) => {
    const r = await run('pdfinfo', [pdf]);
    if (r.code === 0) return r.stdout.length >= STDOUT_MAX ? 0 : pdfinfoPages(r.stdout);
    if (r.timedOut || (r.code !== null && NEVER_OPENS.has(r.code))) return 0;
    throw new PdfToolError('failed');
  });
}

/** `range` as JPEGs, in order; PdfToolError('failed') if pdftoppm fails, hangs or writes none. */
export function renderPdfPages(
  bytes: Uint8Array,
  range: PageRange,
  run: PdfRun = spawnPoppler,
): Promise<PdfPageImage[]> {
  return withPdf(bytes, async (pdf, dir) => {
    const r = await run('pdftoppm', pdftoppmArgs({ pdf, outRoot: join(dir, 'p'), range }));
    if (r.code !== 0) throw new PdfToolError('failed');
    const files = (await readdir(dir)).flatMap((name) => {
      const page = pageOfFile(name);
      return page === null ? [] : [{ page, name }];
    });
    if (!files.length) throw new PdfToolError('failed');
    files.sort((a, b) => a.page - b.page);
    return Promise.all(
      files.map(async (f) => ({
        page: f.page,
        jpg: new Uint8Array(await readFile(join(dir, f.name))),
      })),
    );
  });
}
