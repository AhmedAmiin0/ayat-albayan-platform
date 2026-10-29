import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inSlot, pdfPageCount, renderPdfPages, type PdfExit, type PdfRun } from './pdf-render';

// A fake poppler: never the real binaries in a unit test (the image build smoke-renders them, apps/api/Dockerfile).
const PDF = new TextEncoder().encode('%PDF-1.4 fake');
const exit = (over: Partial<PdfExit> = {}): PdfExit => ({ code: 0, stdout: '', timedOut: false, ...over });
const last = (args: readonly string[]) => args[args.length - 1] ?? '';

/** A run that checks the PDF was written, records the temp folder, writes `files` there and answers `out`. */
function fakeRun(out: PdfExit, files: string[] = []) {
  const seen = { dir: '', tool: '' };
  const run: PdfRun = async (tool, args) => {
    seen.tool = tool;
    seen.dir = dirname(last(args));
    expect(existsSync(tool === 'pdfinfo' ? last(args) : (args[args.length - 2] ?? ''))).toBe(true);
    for (const f of files) await writeFile(`${seen.dir}/${f}`, f);
    return out;
  };
  return { run, seen };
}

describe('pdfPageCount (pdfinfo)', () => {
  it('exit 0: the page count; the temp folder is gone afterwards', async () => {
    const { run, seen } = fakeRun(exit({ stdout: 'Pages:          12\n' }));
    await expect(pdfPageCount(PDF, run)).resolves.toBe(12);
    expect([seen.tool, existsSync(seen.dir)]).toEqual(['pdfinfo', false]);
  });

  it('cannot open (1, encrypted), permissions (3), a hang or a report cut at 64 KB: 0, a permanent «no preview»', async () => {
    const cut = exit({ stdout: `Title: ${'x'.repeat(64 * 1024)}\nPages: 3\n` });
    for (const out of [exit({ code: 1 }), exit({ code: 3 }), exit({ code: null, timedOut: true }), cut]) {
      await expect(pdfPageCount(PDF, fakeRun(out).run)).resolves.toBe(0);
    }
  });

  it('99, a crash or the memory cap (killed from outside): failed, so nothing is stored; the folder is gone', async () => {
    for (const out of [exit({ code: 99 }), exit({ code: null })]) {
      const { run, seen } = fakeRun(out);
      await expect(pdfPageCount(PDF, run)).rejects.toMatchObject({ reason: 'failed' });
      expect(existsSync(seen.dir)).toBe(false);
    }
  });
});

describe('renderPdfPages (pdftoppm)', () => {
  it('the pages in numeric order whatever the padding; the folder is gone afterwards', async () => {
    const { run, seen } = fakeRun(exit(), ['p-10.jpg', 'p-09.jpg', 'p-11.jpg']);
    const pages = await renderPdfPages(PDF, { first: 9, last: 11 }, run);
    expect(pages.map((p) => [p.page, new TextDecoder().decode(p.jpg)])).toEqual([[9, 'p-09.jpg'], [10, 'p-10.jpg'], [11, 'p-11.jpg']]);
    expect([seen.tool, existsSync(seen.dir)]).toEqual(['pdftoppm', false]);
  });

  it('a non-zero exit, a timeout or no image at all: failed, and the folder is gone', async () => {
    for (const { out, files } of [
      { out: exit({ code: 1 }), files: ['p-1.jpg'] },
      { out: exit({ code: null, timedOut: true }), files: [] },
      { out: exit(), files: [] },
    ]) {
      const { run, seen } = fakeRun(out, files);
      await expect(renderPdfPages(PDF, { first: 1, last: 1 }, run)).rejects.toMatchObject({ reason: 'failed' });
      expect(existsSync(seen.dir)).toBe(false);
    }
  });
});

describe('inSlot: one run per process, 8 waiting, then busy', () => {
  it('a second job waits for the first; the 10th concurrent one is busy at once', async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const held = new Promise<void>((r) => {
      release = () => r();
    });
    const first = inSlot(() => held.then(() => void order.push('first')));
    const waiting = Array.from({ length: 8 }, (_, i) => inSlot(async () => void order.push(`w${i}`)));
    await expect(inSlot(async () => 'never')).rejects.toMatchObject({ reason: 'busy' });
    await Promise.resolve();
    expect(order).toEqual([]);
    release();
    await Promise.all([first, ...waiting]);
    expect(order).toEqual(['first', ...Array.from({ length: 8 }, (_, i) => `w${i}`)]);
    await expect(inSlot(async () => 'free again')).resolves.toBe('free again');
  });

  it('a failing job frees the slot too', async () => {
    await expect(inSlot(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(inSlot(async () => 'next')).resolves.toBe('next');
  });
});
