import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { orFallback } from '@/common/infra/errors';

const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

afterEach(() => warn.mockClear());

describe('orFallback', () => {
  it('answers the value and logs nothing when the promise resolves', async () => {
    await expect(orFallback(Promise.resolve(3), null, 'count read')).resolves.toBe(3);
    expect(warn).not.toHaveBeenCalled();
  });

  it('answers the fallback when the promise rejects', async () => {
    await expect(orFallback(Promise.reject(new Error('boom')), false, 'exists')).resolves.toBe(false);
  });

  it('logs one warning that names what failed and why', async () => {
    await orFallback(Promise.reject(new Error('timeout')), null, 'template read');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('template read failed, using the fallback: timeout');
  });

  it('logs a thrown non-error value as text', async () => {
    await orFallback(Promise.reject('down'), null, 'number read');
    expect(warn).toHaveBeenCalledWith('number read failed, using the fallback: down');
  });
});
