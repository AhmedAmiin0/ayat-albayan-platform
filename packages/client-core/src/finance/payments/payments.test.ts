import { describe, expect, it, vi } from 'vitest';
import { pendingRequestId, uploadOnce } from '../../index.js';

describe('uploadOnce', () => {
  it('uploads a file once: the retry re-sends its path', async () => {
    const once = uploadOnce<string>();
    const upload = vi.fn(async () => 'receipts/a.jpg');
    expect(await once('a', upload)).toBe('receipts/a.jpg');
    expect(await once('a', upload)).toBe('receipts/a.jpg');
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('another file uploads anew and becomes the remembered one', async () => {
    const once = uploadOnce<string>();
    await once('a', async () => 'pa');
    expect(await once('b', async () => 'pb')).toBe('pb');
    const again = vi.fn(async () => 'pa2');
    expect(await once('a', again)).toBe('pa2'); // only the last file is kept
    expect(again).toHaveBeenCalledTimes(1);
  });

  it('a failed upload keeps nothing: the next try uploads again', async () => {
    const once = uploadOnce<object>();
    const file = {};
    await expect(once(file, async () => Promise.reject(new Error('storage')))).rejects.toThrow('storage');
    expect(await once(file, async () => 'p')).toBe('p');
  });

  it('keys by identity (a File object)', async () => {
    const once = uploadOnce<object>();
    const file = {};
    await once(file, async () => 'p1');
    const other = vi.fn(async () => 'p2');
    expect(await once({}, other)).toBe('p2');
  });
});

describe('pendingRequestId', () => {
  it('one id re-sent on every retry, a new one after settle', () => {
    const make = vi.fn().mockReturnValueOnce('r1').mockReturnValueOnce('r2');
    const id = pendingRequestId(make);
    expect(id.current()).toBe('r1');
    expect(id.current()).toBe('r1');
    id.settle();
    expect(id.current()).toBe('r2');
    expect(make).toHaveBeenCalledTimes(2);
  });

  it('makes nothing until the first send', () => {
    const make = vi.fn(() => 'r');
    pendingRequestId(make);
    expect(make).not.toHaveBeenCalled();
  });
});
