import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { formatTimeOff, toTimeOffBody } from './time-off';

const draft = { from: '2026-10-05', to: '2026-10-07', reason: '' };

describe('time-off draft → body (R-TCH-02, rule 6)', () => {
  it('whole local days: «من» at midnight, «إلى» included (ends the next midnight), UTC ISO', () => {
    const r = toTimeOffBody(draft);
    expect(r).toEqual({
      ok: true,
      body: {
        starts_at: new Date(2026, 9, 5).toISOString(),
        ends_at: new Date(2026, 9, 8).toISOString(),
        reason: null,
      },
    });
  });

  it('one day off: from = to', () => {
    const r = toTimeOffBody({ ...draft, to: draft.from });
    expect(r.ok && r.body.ends_at).toBe(new Date(2026, 9, 6).toISOString());
  });

  it('keeps a trimmed reason', () => {
    const r = toTimeOffBody({ ...draft, reason: '  سفر ' });
    expect(r.ok && r.body.reason).toBe('سفر');
  });

  it('rejects an end before the start', () => {
    const r = toTimeOffBody({ ...draft, to: '2026-10-03' });
    expect(r).toEqual({ ok: false, error: t.common.endBeforeStart });
  });

  it('rejects missing dates', () => {
    expect(toTimeOffBody({ ...draft, from: '' })).toEqual({ ok: false, error: t.common.required });
    expect(toTimeOffBody({ ...draft, to: '' })).toEqual({ ok: false, error: t.common.required });
  });
});

describe('time-off span display (docs/07 §2, §8)', () => {
  const iso = (...p: [number, number, number, number?]) => new Date(...p).toISOString();
  const EASTERN = /[٠-٩]/;

  it('shows whole days with an exclusive end, in Western digits', () => {
    const text = formatTimeOff(iso(2026, 9, 10), iso(2026, 9, 13));
    expect(text).toContain('10');
    expect(text).toContain('12 أكتوبر');
    expect(text).not.toContain('13');
    expect(text).not.toMatch(EASTERN);
  });

  it('a single whole day reads as one date', () => {
    expect(formatTimeOff(iso(2026, 10, 5), iso(2026, 10, 6))).not.toMatch(/–|-/);
  });

  it('keeps the times of a partial-day span', () => {
    const text = formatTimeOff(iso(2026, 9, 5, 10), iso(2026, 9, 7, 18));
    expect(text).toContain('10:00');
    expect(text).toContain('18:00');
    expect(text).not.toMatch(EASTERN);
  });
});
