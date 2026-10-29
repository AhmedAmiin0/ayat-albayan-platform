import { INVOICE_MAX_BYTES } from '@ab/shared';
import { lstat, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pdfPageCount as askPages, renderPdfPages as askRender } from './pdf-client';
import { pdfPageCount, PdfToolError, renderPdfPages } from './pdf-render';
import { parseOp, serve } from './pdf-sandbox.handler';

// ayat-pdf's handler on a real temp socket, asked through the real client. Poppler is mocked: its argv, limits
// and temp folder are pdf-render.test.ts / pdf-render.spawn.test.ts; the slot (inSlot) is the real one.
vi.mock('./pdf-render', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  pdfPageCount: vi.fn(),
  renderPdfPages: vi.fn(),
}));
const count = vi.mocked(pdfPageCount);
const render = vi.mocked(renderPdfPages);
const PDF = new TextEncoder().encode('%PDF-1.4 fake');
let dir = '';
let socket = '';
let server: Server | null = null;

/** One raw request (not the client's): its status. */
const raw = (opts: { method: string; path: string }, body?: Uint8Array) =>
  new Promise<number>((resolve, reject) => {
    const req = request({ socketPath: socket, ...opts }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.once('error', reject);
    req.end(body);
  });

beforeEach(async () => {
  count.mockReset();
  render.mockReset();
  dir = await mkdtemp(join(tmpdir(), 'pdfs-'));
  socket = join(dir, 'pdf.sock');
  // The last run's socket outlives the container on the volume: serve() replaces it.
  await writeFile(socket, 'stale');
  server = await serve(socket);
});
afterEach(async () => {
  const s = server;
  s?.closeAllConnections();
  await new Promise<void>((ok) => (s ? s.close(() => ok()) : ok()));
  await rm(dir, { recursive: true, force: true });
});

describe('parseOp: only the two calls, a range of at most 5 pages', () => {
  it.each([
    ['POST', '/pages', { op: 'pages' }],
    ['POST', '/render?first=2&last=6', { op: 'render', range: { first: 2, last: 6 } }],
    ['POST', '/render?last=1&first=1', { op: 'render', range: { first: 1, last: 1 } }],
    ['GET', '/pages', null],
    ['POST', '/pages?first=1', null],
    ['POST', '/render?first=2&last=7', null],
    ['POST', '/render?first=0&last=1', null],
    ['POST', '/render?first=3&last=2', null],
    ['POST', '/render?first=1.5&last=2', null],
    ['POST', '/render?first=-1&last=2', null],
    ['POST', '/render?first=1&last=1&tool=pdftoppm', null],
    ['POST', '/run?tool=pdftoppm', null],
    ['POST', undefined, null],
  ])('%s %s → %o', (method, url, op) => {
    expect(parseOp(method, url)).toEqual(op);
  });
});

describe('the sandbox over its socket', () => {
  it('listens owner-only (0600), in place of a stale file; GET /health is 200', async () => {
    const st = await lstat(socket);
    expect([st.isSocket(), st.mode & 0o777]).toEqual([true, 0o600]);
    expect(await raw({ method: 'GET', path: '/health' })).toBe(200);
  });

  it('pages and render: the PDF reaches poppler byte for byte, the answers come back', async () => {
    count.mockResolvedValue(7);
    render.mockResolvedValue([{ page: 2, jpg: new Uint8Array([1, 2]) }, { page: 3, jpg: new Uint8Array([3]) }]);
    await expect(askPages(PDF, { socket })).resolves.toBe(7);
    const pages = await askRender(PDF, { first: 2, last: 3 }, { socket });
    expect(pages.map((p) => [p.page, [...p.jpg]])).toEqual([[2, [1, 2]], [3, [3]]]);
    expect([...(count.mock.calls[0]?.[0] ?? [])]).toEqual([...PDF]);
    expect(render.mock.calls[0]?.[1]).toEqual({ first: 2, last: 3 });
  });

  it('poppler failed or anything thrown: 500, failed for the client', async () => {
    count.mockRejectedValueOnce(new PdfToolError('failed')).mockRejectedValueOnce(new Error('boom'));
    for (let i = 0; i < 2; i++) await expect(askPages(PDF, { socket })).rejects.toMatchObject({ reason: 'failed' });
  });

  it('an unknown request is 400 and a Content-Length over 10 MB is 413, poppler never asked', async () => {
    expect(await raw({ method: 'POST', path: '/run?tool=pdftoppm' }, PDF)).toBe(400);
    expect(await raw({ method: 'POST', path: '/pages' }, new Uint8Array(INVOICE_MAX_BYTES + 1))).toBe(413);
    expect([count.mock.calls.length, render.mock.calls.length]).toEqual([0, 0]);
  });

  it('one run and 8 waiting, then 503 read to its end: the copy sees busy, never a broken pipe', async () => {
    let release: (n: number) => void = () => undefined;
    count.mockImplementationOnce(() => new Promise<number>((r) => {
      release = r;
    }));
    count.mockResolvedValue(3);
    // Bigger than the socket's buffers: answering before the body is in would break the sender's write.
    const big = new Uint8Array(4 * 1024 * 1024);
    const first = askPages(big, { socket });
    await vi.waitFor(() => expect(count).toHaveBeenCalledTimes(1));
    const waiting = Array.from({ length: 8 }, () => askPages(big, { socket }));
    await new Promise((r) => setTimeout(r, 200));
    await expect(askPages(big, { socket })).rejects.toMatchObject({ reason: 'busy' });
    release(12);
    await expect(first).resolves.toBe(12);
    await expect(Promise.all(waiting)).resolves.toEqual(Array.from({ length: 8 }, () => 3));
  });
});
