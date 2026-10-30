import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pdfPageCount, renderPdfPages } from './pdf-render';

// The real spawn wrapper against a fake child process: the limits a crafted PDF meets (owner 2026-10-29).
const spawn = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ spawn }));

const PDF = new TextEncoder().encode('%PDF-1.4 fake');
type End = { code: number | null; killed?: boolean; stdout?: string; enoent?: boolean };

/** A child that ends as `end` says; `killed` is what node sets when ITS timeout killed the child. */
function child(end: End) {
  const c = Object.assign(new EventEmitter(), { stdout: new PassThrough(), killed: end.killed ?? false });
  // A sink beside spawnPoppler's own once('error'): an emit with no listener would throw an uncaught error.
  c.on('error', () => undefined);
  setImmediate(() => {
    if (end.enoent) {
      c.emit('error', new Error('spawn /usr/bin/nice ENOENT'));
      return;
    }
    c.stdout.end(end.stdout ?? '');
    setImmediate(() => c.emit('close', end.code));
  });
  return c;
}
const spawned = () => {
  const [cmd, argv, opts] = spawn.mock.calls[0] ?? [];
  return { cmd, argv, opts };
};

describe('spawnPoppler: niced, OOM-killer first, address space capped, SIGKILL on timeout', () => {
  beforeEach(() => spawn.mockReset());

  it('pdfinfo runs as nice → choom 1000 → prlimit 256 MiB, env PATH only, no stdin/stderr, 5 s timeout', async () => {
    spawn.mockImplementation(() => child({ code: 0, stdout: 'Pages:          3\n' }));
    await expect(pdfPageCount(PDF)).resolves.toBe(3);
    const { cmd, argv, opts } = spawned();
    expect(cmd).toBe('/usr/bin/nice');
    expect(argv.slice(0, 10)).toEqual(['-n', '10', 'choom', '-n', '1000', '--', 'prlimit', '--as=268435456', '--', 'pdfinfo']);
    expect(argv[10]).toMatch(/in\.pdf$/);
    expect(opts).toEqual({ stdio: ['ignore', 'pipe', 'ignore'], env: { PATH: '/usr/bin:/bin' }, timeout: 5_000, killSignal: 'SIGKILL' });
  });

  it('pdfinfo killed by its own timeout: 0 pages for good; killed from outside (the memory cap): failed, retried later', async () => {
    spawn.mockImplementationOnce(() => child({ code: null, killed: true }));
    await expect(pdfPageCount(PDF)).resolves.toBe(0);
    spawn.mockImplementationOnce(() => child({ code: null, killed: false }));
    await expect(pdfPageCount(PDF)).rejects.toMatchObject({ reason: 'failed' });
  });

  it('pdftoppm gets 20 s, and a timeout kill is failed (nothing stored)', async () => {
    spawn.mockImplementation(() => child({ code: null, killed: true }));
    await expect(renderPdfPages(PDF, { first: 2, last: 6 })).rejects.toMatchObject({ reason: 'failed' });
    const { argv, opts } = spawned();
    expect(argv.slice(9, 15)).toEqual(['pdftoppm', '-jpeg', '-jpegopt', 'quality=70', '-scale-to', '1600']);
    expect(opts).toMatchObject({ timeout: 20_000, killSignal: 'SIGKILL' });
  });

  it('no poppler in the image (ENOENT): failed', async () => {
    spawn.mockImplementation(() => child({ code: null, enoent: true }));
    await expect(pdfPageCount(PDF)).rejects.toMatchObject({ reason: 'failed' });
  });
});
