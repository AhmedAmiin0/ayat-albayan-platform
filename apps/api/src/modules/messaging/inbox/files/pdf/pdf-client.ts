import { lstat } from 'node:fs/promises';
import { request } from 'node:http';
import { z } from 'zod';
import type { PageRange } from './pdf-pages';
import { PdfToolError, type PdfPageImage } from './pdf-render';
import { PDF_SOCKET, readCapped } from './pdf-wire';

// The API's side of the PDF sandbox (docs/09 «PDF sandbox»): the two calls of pdf-render.ts, answered by
// poppler in ayat-pdf (no secrets, no network). An API copy never runs poppler itself: no socket (local dev,
// tests, CI) is PdfToolError('unavailable'), a 503 pdf_unavailable.

/** `socket`: tests listen on a temp path; `timeoutMs`: tests wait less. */
type SandboxOpts = { socket?: string; timeoutMs?: number };

/** Whole call, queue included: the other copy's 20 s render ahead of ours, then our own 20 s, plus transfer. */
const TIMEOUT_MS = 45_000;
/** Five 1600 px JPEGs as base64 JSON are a few MB; more is never a preview (a sandbox gone wrong). */
const ANSWER_MAX = 16 * 1024 * 1024;
/** No listener behind the path (ayat-pdf down or restarting): retry later, nothing remembered about the PDF. */
const UNREACHABLE = new Set(['ENOENT', 'ECONNREFUSED', 'EACCES', 'ENOTSOCK']);

const pagesAnswer = z.object({ pages: z.number().int().min(0) });
const renderAnswer = z.object({ images: z.array(z.object({ page: z.number().int(), jpg: z.string() })) });

/**
 * ayat-pdf is there to ask: a socket at its path. Only a socket, never a file or a link the sandbox
 * could plant on the shared volume. Checked before a render takes the slot or reads the PDF.
 */
export async function sandboxReady(socket: string = PDF_SOCKET): Promise<boolean> {
  const st = await lstat(socket).catch(() => null);
  return st?.isSocket() ?? false;
}

/** pdf-render's pdfPageCount, in ayat-pdf: the page count, 0 = never previews. */
export async function pdfPageCount(bytes: Uint8Array, opts: SandboxOpts = {}): Promise<number> {
  return parse(pagesAnswer, await call({ path: '/pages', bytes, opts })).pages;
}

/** pdf-render's renderPdfPages, in ayat-pdf: the JPEGs of `range` (any page outside it is dropped). */
export async function renderPdfPages(bytes: Uint8Array, range: PageRange, opts: SandboxOpts = {}): Promise<PdfPageImage[]> {
  const answer = parse(renderAnswer, await call({ path: `/render?first=${range.first}&last=${range.last}`, bytes, opts }));
  const images = answer.images.filter((i) => i.page >= range.first && i.page <= range.last);
  if (!images.length) throw new PdfToolError('failed');
  return images.map((i) => ({ page: i.page, jpg: new Uint8Array(Buffer.from(i.jpg, 'base64')) }));
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new PdfToolError('failed');
  return r.data;
}

/** 200 → its JSON; 503 → 'busy' (its queue is full); anything else → 'failed'. */
async function call(input: { path: string; bytes: Uint8Array; opts: SandboxOpts }): Promise<unknown> {
  const socketPath = input.opts.socket ?? PDF_SOCKET;
  if (!(await sandboxReady(socketPath))) throw new PdfToolError('unavailable');
  const { status, body } = await post({ socketPath, path: input.path, bytes: input.bytes, timeoutMs: input.opts.timeoutMs ?? TIMEOUT_MS });
  if (status === 503) throw new PdfToolError('busy');
  if (status !== 200 || body === null) throw new PdfToolError('failed');
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new PdfToolError('failed');
  }
}

type Post = { socketPath: string; path: string; bytes: Uint8Array; timeoutMs: number };

/** One POST on a fresh connection, aborted as a whole after `timeoutMs` (a slow trickle cannot hold it). */
function post(input: Post): Promise<{ status: number; body: Buffer | null }> {
  return new Promise((resolve, reject) => {
    const fail = (e: unknown) => {
      const code = e instanceof Error && 'code' in e ? String(e.code) : '';
      reject(new PdfToolError(UNREACHABLE.has(code) ? 'unavailable' : 'failed'));
    };
    const req = request(
      {
        socketPath: input.socketPath,
        path: input.path,
        method: 'POST',
        agent: false,
        signal: AbortSignal.timeout(input.timeoutMs),
        headers: { 'content-type': 'application/pdf', 'content-length': input.bytes.byteLength },
      },
      (res) => readCapped(res, ANSWER_MAX).then((body) => resolve({ status: res.statusCode ?? 0, body }), fail),
    );
    req.once('error', fail);
    req.end(input.bytes);
  });
}
