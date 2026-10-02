import { describe, expect, it, vi } from 'vitest';
import { retry } from './retry';

describe('retry — backoff around one PDF publish', () => {
  it('returns the first success without waiting', async () => {
    const sleep = vi.fn(async () => undefined);
    await expect(retry(async () => 'ok', { delays: [2, 8], sleep })).resolves.toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('waits each delay in turn and succeeds on a later attempt', async () => {
    const sleep = vi.fn(async () => undefined);
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('a'))
      .mockRejectedValueOnce(new Error('b'))
      .mockResolvedValue('ok');
    await expect(retry(fn, { delays: [2, 8], sleep })).resolves.toBe('ok');
    expect(sleep.mock.calls).toEqual([[2], [8]]);
  });

  it('rethrows the last error after delays.length + 1 attempts', async () => {
    const sleep = vi.fn(async () => undefined);
    let n = 0;
    const fn = async () => {
      n += 1;
      throw new Error(`fail ${n}`);
    };
    await expect(retry(fn, { delays: [2, 8], sleep })).rejects.toThrow('fail 3');
    expect(n).toBe(3);
  });
});
