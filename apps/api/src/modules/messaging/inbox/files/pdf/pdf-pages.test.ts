import { describe, expect, it, vi } from 'vitest';
import { FailedRecently, InFlight, pageOfFile, pageRange, pdfinfoPages, pdftoppmArgs } from './pdf-pages';

describe('pageRange: page 1 alone, then runs of 5 cut at the page count and at 30', () => {
  it.each([
    [1, 40, { first: 1, last: 1 }],
    [2, 40, { first: 2, last: 6 }],
    [6, 40, { first: 2, last: 6 }],
    [7, 40, { first: 7, last: 11 }],
    [9, 9, { first: 7, last: 9 }],
    [3, 3, { first: 2, last: 3 }],
    [30, 500, { first: 27, last: 30 }],
  ])('page %i of %i → %o', (page, pages, range) => {
    expect(pageRange(page, pages)).toEqual(range);
  });
});

describe('pdfinfoPages', () => {
  it('reads «Pages:» from the report; none is 0', () => {
    expect(pdfinfoPages('Title:          خطة\nPages:          12\nEncrypted:      no\n')).toBe(12);
    expect(pdfinfoPages('Producer: x\n')).toBe(0);
    expect(pdfinfoPages('')).toBe(0);
  });

  it('clamps a crafted count: never a column overflow and a probe on every view', () => {
    expect(pdfinfoPages('Pages:          99999999999\n')).toBe(100_000);
  });
});

describe('pdftoppmArgs', () => {
  it('JPEG q70, long side 1600 px, the range only, then the input and the output root', () => {
    expect(pdftoppmArgs({ pdf: '/t/in.pdf', outRoot: '/t/p', range: { first: 7, last: 11 } })).toEqual([
      '-jpeg', '-jpegopt', 'quality=70', '-scale-to', '1600', '-f', '7', '-l', '11', '/t/in.pdf', '/t/p',
    ]);
  });
});

describe('pageOfFile', () => {
  it('parses padded and unpadded names; anything else is null', () => {
    expect(['p-07.jpg', 'p-1.jpg', 'p-030.jpg'].map(pageOfFile)).toEqual([7, 1, 30]);
    expect(['in.pdf', 'p-07.png', 'q-1.jpg', 'p-.jpg'].map(pageOfFile)).toEqual([null, null, null, null]);
  });
});

describe('InFlight', () => {
  it('one call per key while it runs; the key is free again after it resolves or rejects', async () => {
    const flight = new InFlight<number>();
    let release: (n: number) => void = () => undefined;
    const fn = vi.fn(() => new Promise<number>((r) => (release = r)));
    const a = flight.run('m1', fn);
    const b = flight.run('m1', fn);
    expect(fn).toHaveBeenCalledTimes(1);
    release(3);
    await expect(Promise.all([a, b])).resolves.toEqual([3, 3]);
    await expect(flight.run('m1', async () => 4)).resolves.toBe(4);
    await expect(flight.run('m1', async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(flight.run('m1', async () => 5)).resolves.toBe(5);
  });
});

describe('FailedRecently', () => {
  it('refuses a key for `ms`, then forgets it', () => {
    let now = 1_000;
    const failed = new FailedRecently(600_000, () => now);
    failed.add('m1:2');
    expect([failed.has('m1:2'), failed.has('m1:7')]).toEqual([true, false]);
    now += 600_000;
    expect(failed.has('m1:2')).toBe(false);
  });
});
