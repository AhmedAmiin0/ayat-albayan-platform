import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inTempDir } from '../temp-dir';
import { pageOfFile, pdfinfoPages, pdftoppmArgs, type PageRange } from './pdf-pages';

type PopplerTool = 'pdfinfo' | 'pdftoppm';
/** How a run ended: the exit code (null when killed), the start of stdout, and whether our timeout killed it. */
export type PdfExit = { code: number | null; stdout: string; timedOut: boolean };
/** Runs a poppler tool on files in a temp folder; rejects (PdfToolError 'failed') only when it cannot start. */
export type PdfRun = (tool: PopplerTool, args: readonly string[]) => Promise<PdfExit>;
export type PdfPageImage = { page: number; jpg: Uint8Array };

/** 'busy': the render queue is full, try again; 'failed': the tool crashed, hung or could not start (not stored). */
export class PdfToolError extends Error {
  constructor(readonly reason: 'busy' | 'failed') {
    super(`pdf preview ${reason}`);
  }
}

// Calibration knobs (docs/09: measure with a scanned 10 MB PDF on staging).
const TIMEOUT_MS: Record<PopplerTool, number> = { pdfinfo: 5_000, pdftoppm: 20_000 };
/**
 * Address space per run: a crafted page fails its own malloc, never the API's memory. Resources only, like
 * nice, choom and the timeout: an exploited poppler is still uid node in the API container (docs/09).
 */
const AS_BYTES = 256 * 1024 * 1024;
/** stdout kept per run; a pdfinfo report this long (a padded Title) may have lost its «Pages:» line. */
const STDOUT_MAX = 64 * 1024;
/** pdfinfo cannot open the file (1: broken, or a user password) or refuses it (3: permissions): it never previews. */
const NEVER_OPENS = new Set([1, 3]);
/** One render per API copy at a time; this many may wait, the next is 'busy'. */
const QUEUE_MAX = 8;

/**
 * The image's poppler-utils (apps/api/Dockerfile) as uid node, run through `nice` (the API's requests go
 * first), `choom -n 1000` (in a memory squeeze the kernel kills the tool, not node) and `prlimit --as`;
 * no stdin, no stderr, an env with PATH alone, SIGKILLed after TIMEOUT_MS. `child.killed` is set only
 * by that timeout kill: a kill from outside (the OOM killer, the address-space cap) is a crash, not a hang.
 */
const spawnPoppler: PdfRun = (tool, args) =>
  new Promise((resolve, reject) => {
    const argv = ['-n', '10', 'choom', '-n', '1000', '--', 'prlimit', `--as=${AS_BYTES}`, '--', tool, ...args];
    const child = spawn('/usr/bin/nice', argv, {
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { PATH: '/usr/bin:/bin' },
      timeout: TIMEOUT_MS[tool],
      killSignal: 'SIGKILL',
    });
    let stdout = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (s: string) => {
      if (stdout.length < STDOUT_MAX) stdout += s;
    });
    child.once('error', () => reject(new PdfToolError('failed')));
    child.once('close', (code) => resolve({ code, stdout, timedOut: child.killed }));
  });

let running = false;
const waiting: (() => void)[] = [];

/**
 * `fn` alone in this process: poppler's memory and CPU stay one run deep per API copy. The caller takes
 * the slot before it reads the PDF from storage, so a waiting request holds no PDF bytes.
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
 * The page count, or 0 = a permanent «no preview»: pdfinfo cannot open it (1, an encrypted file too),
 * refuses it (3), hangs (5 s on one file is pathological) or prints STDOUT_MAX or more (cut, so its count
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

/** The JPEGs of `range` in page order; PdfToolError('failed') when pdftoppm fails, hangs or writes none. */
export function renderPdfPages(bytes: Uint8Array, range: PageRange, run: PdfRun = spawnPoppler): Promise<PdfPageImage[]> {
  return withPdf(bytes, async (pdf, dir) => {
    const r = await run('pdftoppm', pdftoppmArgs({ pdf, outRoot: join(dir, 'p'), range }));
    if (r.code !== 0) throw new PdfToolError('failed');
    const files = (await readdir(dir)).flatMap((name) => {
      const page = pageOfFile(name);
      return page === null ? [] : [{ page, name }];
    });
    if (!files.length) throw new PdfToolError('failed');
    files.sort((a, b) => a.page - b.page);
    return Promise.all(files.map(async (f) => ({ page: f.page, jpg: new Uint8Array(await readFile(join(dir, f.name))) })));
  });
}
