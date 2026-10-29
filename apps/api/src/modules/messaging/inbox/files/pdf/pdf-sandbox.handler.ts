import { INVOICE_MAX_BYTES } from '@ab/shared';
import { chmod, rm } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PDF_RUN, type PageRange } from './pdf-pages';
import { inSlot, PdfToolError, pdfPageCount, renderPdfPages } from './pdf-render';
import { PDF_SOCKET, readCapped } from './pdf-wire';

// ayat-pdf's HTTP side (docs/09 «PDF sandbox»): poppler (pdf-render.ts, unchanged: nice, choom, prlimit,
// SIGKILL timeouts, 64 KB of stdout, the temp folder removed) on the PDF an API copy posts. Only these
// requests, one PDF at a time (inSlot: 8 waiting, then 503), a body of at most INVOICE_MAX_BYTES.

type Op = { op: 'pages' } | { op: 'render'; range: PageRange };

const int = (s: string | null): number | null => (s !== null && /^\d{1,6}$/.test(s) ? Number(s) : null);

/** POST /pages, or POST /render?first=&last= with 1 ≤ first ≤ last < first + PDF_RUN; anything else is null. */
export function parseOp(method: string | undefined, url: string | undefined): Op | null {
  const u = method === 'POST' && url ? URL.parse(url, 'http://pdf') : null;
  if (!u) return null;
  if (u.pathname === '/pages' && !u.search) return { op: 'pages' };
  if (u.pathname !== '/render' || [...u.searchParams.keys()].sort().join() !== 'first,last') return null;
  const first = int(u.searchParams.get('first'));
  const last = int(u.searchParams.get('last'));
  if (first === null || last === null || first < 1 || last < first || last - first >= PDF_RUN) return null;
  return { op: 'render', range: { first, last } };
}

/** Answers once the request's body is in (read, or drained unread): the sender sees this status, never an EPIPE. */
function send(res: ServerResponse, status: number, body: unknown): void {
  const answer = () => {
    if (res.headersSent || res.destroyed) return;
    res.writeHead(status, { 'content-type': 'application/json', connection: 'close' }).end(JSON.stringify(body));
  };
  if (res.req.complete) answer();
  else res.req.once('end', answer).resume();
}

async function run(op: Op, bytes: Uint8Array): Promise<unknown> {
  if (op.op === 'pages') return { pages: await pdfPageCount(bytes) };
  const images = await renderPdfPages(bytes, op.range);
  return { images: images.map((i) => ({ page: i.page, jpg: Buffer.from(i.jpg).toString('base64') })) };
}

/** 200 the answer; 400 an unknown request; 413 no or too big a Content-Length; 503 queue full; 500 poppler failed. */
async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
  const op = parseOp(req.method, req.url);
  if (!op) return send(res, 400, { error: 'bad_request' });
  const length = Number(req.headers['content-length']);
  if (!(length >= 1 && length <= INVOICE_MAX_BYTES)) return send(res, 413, { error: 'too_large' });
  try {
    const out = await inSlot(async () => {
      // The body is read only here, so the PDFs waiting stay in their senders, not in this container's memory.
      // An API copy that gave up while this waited (its timeout) leaves the slot to the next one.
      if (req.socket.destroyed) return null;
      const bytes = await readCapped(req, INVOICE_MAX_BYTES);
      return bytes ? run(op, bytes) : null;
    });
    send(res, out === null ? 413 : 200, out ?? { error: 'too_large' });
  } catch (e) {
    sendError(res, e);
  }
}

/** PdfToolError('busy') (the queue is full) → 503; anything else (poppler failed, a bug) → 500. */
function sendError(res: ServerResponse, e: unknown): void {
  const reason = e instanceof PdfToolError ? e.reason : 'failed';
  send(res, reason === 'busy' ? 503 : 500, { error: reason });
}

/**
 * Listens on `path` (the last run's socket removed first: the volume outlives the container), owner only:
 * ayat-pdf and the API copies are the same uid (node, apps/api/Dockerfile).
 */
export async function serve(path = PDF_SOCKET): Promise<Server> {
  await rm(path, { force: true });
  const server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((ok, fail) => server.once('error', fail).listen(path, ok));
  await chmod(path, 0o600);
  return server;
}
