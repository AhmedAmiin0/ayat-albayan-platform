import { describe, expect, it } from 'vitest';
import { parseDay, parseWindow } from './lesson-queries.schema';

const caught = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { getResponse(): unknown }).getResponse();
  }
  throw new Error('expected a throw');
};

describe('parseWindow — time-window lists (docs/10 §3 Lists, R-NFR-08)', () => {
  it('half-open [from, to) with an optional teacherId', () => {
    const w = parseWindow({
      from: '2026-10-04T00:00:00+03:00',
      to: '2026-10-11T00:00:00+03:00',
      teacherId: '00000000-0000-4000-8000-0000000000b1',
    });
    expect(w.from.toISOString()).toBe('2026-10-03T21:00:00.000Z');
    expect(w.to.toISOString()).toBe('2026-10-10T21:00:00.000Z');
    expect(w.teacherId).toBe('00000000-0000-4000-8000-0000000000b1');
  });

  it('31 days is fine, more is 400 range_too_large', () => {
    expect(() => parseWindow({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z' })).not.toThrow();
    expect(caught(() => parseWindow({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:01Z' }))).toEqual({
      code: 'range_too_large',
      message: 'range_too_large',
    });
  });

  it('missing / non-instant / reversed bounds → validation_failed', () => {
    expect(caught(() => parseWindow({ from: '2026-10-01' }))).toMatchObject({ message: 'validation_failed' });
    expect(
      caught(() => parseWindow({ from: '2026-10-02T00:00:00Z', to: '2026-10-01T00:00:00Z' })),
    ).toMatchObject({ message: 'validation_failed' });
  });
});

describe('parseDay — one local day (docs/10 route 2)', () => {
  it('defaults to the Riyadh day', () => {
    const d = parseDay({ date: '2026-10-04' });
    expect([d.from.toISOString(), d.to.toISOString()]).toEqual([
      '2026-10-03T21:00:00.000Z',
      '2026-10-04T21:00:00.000Z',
    ]);
  });

  it('a Cairo DST day is 25 hours long (fall-back night 29/30 Oct)', () => {
    const d = parseDay({ date: '2026-10-29', tz: 'Africa/Cairo' });
    expect(d.from.toISOString()).toBe('2026-10-28T21:00:00.000Z');
    expect(d.to.toISOString()).toBe('2026-10-29T22:00:00.000Z');
  });

  it('no tz → the academy zone it is given (settings.academy_timezone)', () => {
    const d = parseDay({ date: '2026-10-04' }, 'Africa/Cairo');
    expect(d.from.toISOString()).toBe('2026-10-03T21:00:00.000Z');
    expect(parseDay({ date: '2026-12-04' }, 'Africa/Cairo').from.toISOString()).toBe('2026-12-03T22:00:00.000Z');
  });

  it('rejects a bad date or an unknown zone', () => {
    expect(caught(() => parseDay({ date: '04/10/2026' }))).toMatchObject({ message: 'validation_failed' });
    expect(caught(() => parseDay({ date: '2026-10-04', tz: 'Mars/Base' }))).toMatchObject({
      message: 'validation_failed',
    });
  });
});
