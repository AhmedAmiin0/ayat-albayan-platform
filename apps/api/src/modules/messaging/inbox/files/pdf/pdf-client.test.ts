import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pdfPageCount, renderPdfPages } from './pdf-client';

// The API's side of the PDF sandbox against a stand-in ayat-pdf on a temp unix socket: no poppler here.
const PDF = new TextEncoder().encode('%PDF-1.4 fake');
type Reply = (res: ServerResponse) => void;
let dir = '';
let server: Server | null = null;
const sock = () => join(dir, 'pdf.sock');
const json = (status: number, body: unknown): Reply => (res) => {
  res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
};
const jpg = (n: number) => Buffer.from([0xff, 0xd8, n]).toString('base64');

/** A stand-in sandbox: request i (read to its end, recorded) gets replies[i], or the last one. */
async function sandbox(...replies: Reply[]) {
  const seen: { method?: string; url?: string; body: number[] }[] = [];
  const s = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body: [...Buffer.concat(chunks)] });
      (replies[seen.length - 1] ?? replies.at(-1))?.(res);
    });
  });
  server = s;
  await new Promise<void>((ok) => s.listen(sock(), ok));
  return seen;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pdfc-'));
});
afterEach(async () => {
  const s = server;
  server = null;
  s?.closeAllConnections();
  await new Promise<void>((ok) => (s ? s.close(() => ok()) : ok()));
  await rm(dir, { recursive: true, force: true });
});

describe('pdf-client: no sandbox is «unavailable», never poppler in the API', () => {
  it('nothing at the default path (CI, local dev) or a plain file at the path: unavailable, no connection', async () => {
    await expect(pdfPageCount(PDF)).rejects.toMatchObject({ reason: 'unavailable' });
    await expect(pdfPageCount(PDF, { socket: sock() })).rejects.toMatchObject({ reason: 'unavailable' });
    await writeFile(sock(), 'not a socket');
    await expect(renderPdfPages(PDF, { first: 1, last: 1 }, { socket: sock() })).rejects.toMatchObject({ reason: 'unavailable' });
  });

  it('a socket left by a stopped sandbox (refused): unavailable', async () => {
    await sandbox(json(200, { pages: 1 }));
    const left = join(dir, 'left.sock');
    await rename(sock(), left);
    const s = server;
    server = null;
    await new Promise<void>((ok) => (s ? s.close(() => ok()) : ok()));
    await expect(pdfPageCount(PDF, { socket: left })).rejects.toMatchObject({ reason: 'unavailable' });
  });
});

describe('pdf-client: the two calls over the socket', () => {
  it('pages: POST /pages with the PDF as the body, the count back', async () => {
    const seen = await sandbox(json(200, { pages: 12 }));
    await expect(pdfPageCount(PDF, { socket: sock() })).resolves.toBe(12);
    expect(seen).toEqual([{ method: 'POST', url: '/pages', body: [...PDF] }]);
  });

  it('render: POST /render?first=&last=, the JPEGs back by page; a page outside the range is dropped', async () => {
    const seen = await sandbox(json(200, { images: [{ page: 2, jpg: jpg(2) }, { page: 3, jpg: jpg(3) }, { page: 99, jpg: jpg(9) }] }));
    const pages = await renderPdfPages(PDF, { first: 2, last: 6 }, { socket: sock() });
    expect(pages.map((p) => [p.page, [...p.jpg]])).toEqual([[2, [0xff, 0xd8, 2]], [3, [0xff, 0xd8, 3]]]);
    expect(seen.map((r) => r.url)).toEqual(['/render?first=2&last=6']);
  });

  it('503 (its queue is full): busy; 500, a malformed answer or no image at all: failed', async () => {
    await sandbox(
      json(503, { error: 'busy' }),
      json(500, { error: 'failed' }),
      json(200, { pages: -1 }),
      (res) => res.writeHead(200).end('{oops'),
      json(200, { images: [{ page: 7, jpg: jpg(7) }] }),
    );
    await expect(pdfPageCount(PDF, { socket: sock() })).rejects.toMatchObject({ reason: 'busy' });
    for (let i = 0; i < 3; i++) await expect(pdfPageCount(PDF, { socket: sock() })).rejects.toMatchObject({ reason: 'failed' });
    await expect(renderPdfPages(PDF, { first: 1, last: 1 }, { socket: sock() })).rejects.toMatchObject({ reason: 'failed' });
  });
});

describe('pdf-client: limits a sandbox gone wrong meets', () => {
  it('no answer, or one trickled byte by byte: failed once the whole call passes its timeout', async () => {
    await sandbox(
      () => undefined,
      (res) => {
        res.writeHead(200);
        const t = setInterval(() => res.write(' '), 20);
        res.once('close', () => clearInterval(t));
      },
    );
    for (let i = 0; i < 2; i++) {
      const t0 = Date.now();
      await expect(pdfPageCount(PDF, { socket: sock(), timeoutMs: 150 })).rejects.toMatchObject({ reason: 'failed' });
      expect(Date.now() - t0).toBeLessThan(2_000);
    }
  });

  it('an answer over 16 MB is failed, even valid JSON (read no further)', async () => {
    await sandbox(json(200, { pages: 1, pad: 'x'.repeat(16 * 1024 * 1024) }));
    await expect(pdfPageCount(PDF, { socket: sock() })).rejects.toMatchObject({ reason: 'failed' });
  });
});
