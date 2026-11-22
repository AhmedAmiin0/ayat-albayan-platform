import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { keepingRefusal, refusalOf, rejectStored, withinCap } from './media-refusal';

describe('media refusal', () => {
  it.each([
    [waHttpError('invoice_too_large', 413), 'invoice_too_large'],
    [waHttpError('media_expired', 410), 'media_expired'],
    [waHttpError('evolution_auth', 502), null],
    [new HttpException('plain', 413), null],
    [new Error('timeout'), null],
    ['not an error', null],
  ])('refusalOf(%s) → %s', (e, want) => {
    expect(refusalOf(e)).toBe(want);
  });

  it.each([
    ['invoice_too_large', 413],
    ['media_expired', 410],
  ])('rejectStored(%s) throws %s', (stored, status) => {
    const thrown: unknown = (() => {
      try {
        rejectStored(stored);
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(status);
    expect((thrown as HttpException).getResponse()).toMatchObject({ code: stored });
  });

  it.each([[null], [undefined], ['other']])('rejectStored(%s) lets the file through', (stored) => {
    expect(() => rejectStored(stored)).not.toThrow();
  });

  it('withinCap: the cap itself passes, one byte more is 413', () => {
    const file = { bytes: new Uint8Array(10) };
    expect(withinCap(file, 10)).toBe(file);
    expect(() => withinCap(file, 9)).toThrow(HttpException);
  });

  it('keepingRefusal keeps a final refusal and rethrows the same error', async () => {
    const keep = vi.fn().mockResolvedValue(undefined);
    const e = waHttpError('media_expired', 410);
    await expect(keepingRefusal(() => Promise.reject(e), keep)).rejects.toBe(e);
    expect(keep).toHaveBeenCalledWith('media_expired');
  });

  it('keepingRefusal: success and a retryable failure keep nothing', async () => {
    const keep = vi.fn();
    await expect(keepingRefusal(() => Promise.resolve(1), keep)).resolves.toBe(1);
    await expect(keepingRefusal(() => Promise.reject(new Error('t')), keep)).rejects.toThrow('t');
    expect(keep).not.toHaveBeenCalled();
  });
});
