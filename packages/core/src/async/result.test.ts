import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok, toResult, unwrapOr, type Result } from './result.js';

describe('Result', () => {
  it('ok / err build the two shapes', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
    expect(err('nope')).toEqual({ ok: false, error: 'nope' });
  });

  it('isOk / isErr narrow', () => {
    const good: Result<number> = ok(1);
    const bad: Result<number> = err('x');
    expect([isOk(good), isErr(good)]).toEqual([true, false]);
    expect([isOk(bad), isErr(bad)]).toEqual([false, true]);
  });

  it('unwrapOr takes the value, else the fallback', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
    expect(unwrapOr(err('x'), 0)).toBe(0);
  });

  it('toResult catches a throw into an Err', async () => {
    await expect(toResult(async () => 'v')).resolves.toEqual({ ok: true, value: 'v' });
    const boom = new Error('boom');
    await expect(toResult(async () => Promise.reject(boom))).resolves.toEqual({ ok: false, error: boom });
  });
});
