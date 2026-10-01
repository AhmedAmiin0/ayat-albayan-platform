import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { toTimeOffBody } from './time-off';

const draft = { starts_at: '2026-10-05T10:00', ends_at: '2026-10-07T18:00', reason: '' };

describe('time-off draft → body (R-TCH-02, rule 6)', () => {
  it('converts local datetime inputs to UTC ISO and blank reason to null', () => {
    const r = toTimeOffBody(draft);
    expect(r).toEqual({
      ok: true,
      body: {
        starts_at: new Date(2026, 9, 5, 10, 0).toISOString(),
        ends_at: new Date(2026, 9, 7, 18, 0).toISOString(),
        reason: null,
      },
    });
  });

  it('keeps a trimmed reason', () => {
    const r = toTimeOffBody({ ...draft, reason: '  سفر ' });
    expect(r.ok && r.body.reason).toBe('سفر');
  });

  it('rejects an end before the start', () => {
    const r = toTimeOffBody({ ...draft, ends_at: '2026-10-04T10:00' });
    expect(r).toEqual({ ok: false, error: t.common.endBeforeStart });
  });

  it('rejects missing dates', () => {
    expect(toTimeOffBody({ ...draft, starts_at: '' })).toEqual({ ok: false, error: t.common.required });
  });
});
