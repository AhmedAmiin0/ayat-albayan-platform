import { describe, expect, it } from 'vitest';
import { startBody } from './start-body';

const today = '2026-10-12';
const opts = { canSet: true, today, lessonsTotal: 8 };

describe('startBody: the start fields sent with POST /sales/subscriptions', () => {
  it('without the permission nothing is sent (the API default day), whatever the form holds', () => {
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: true, usedBefore: 0 }, { ...opts, canSet: false })).toEqual({ ok: true, body: {} });
  });

  it('with it: a later day as is, alreadyStarted only when ticked, an empty day is today', () => {
    expect(startBody({ startsOn: '2026-11-01', alreadyStarted: false, usedBefore: 0 }, opts)).toEqual({ ok: true, body: { startsOn: '2026-11-01' } });
    expect(startBody({ startsOn: '', alreadyStarted: false, usedBefore: 0 }, opts)).toEqual({ ok: true, body: { startsOn: today } });
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: true, usedBefore: 0 }, opts)).toEqual({
      ok: true,
      body: { startsOn: '2026-09-01', alreadyStarted: true },
    });
  });

  it('a past day needs the box, and at most a year back', () => {
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: false, usedBefore: 0 }, opts)).toEqual({ ok: false, code: 'start_date_past' });
    expect(startBody({ startsOn: '2025-09-01', alreadyStarted: true, usedBefore: 0 }, opts)).toEqual({ ok: false, code: 'start_date_too_old' });
  });

  it('«حلقات مستخدمة من الباقة» only with the box and when > 0 (owner 2026-10-28)', () => {
    const value = { startsOn: '2026-09-01', alreadyStarted: true, usedBefore: 1 };
    expect(startBody(value, opts)).toEqual({ ok: true, body: { startsOn: '2026-09-01', alreadyStarted: true, lessonsUsedBefore: 1 } });
    expect(startBody({ ...value, usedBefore: 0 }, opts)).toEqual({ ok: true, body: { startsOn: '2026-09-01', alreadyStarted: true } });
    expect(startBody({ ...value, startsOn: '2026-11-01', alreadyStarted: false }, opts)).toEqual({ ok: true, body: { startsOn: '2026-11-01' } });
    expect(startBody(value, { ...opts, canSet: false })).toEqual({ ok: true, body: {} });
  });

  it('the same bounds as the API: a past day, and never the whole package', () => {
    expect(startBody({ startsOn: today, alreadyStarted: true, usedBefore: 1 }, opts)).toEqual({ ok: false, code: 'used_before_needs_past_start' });
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: true, usedBefore: 8 }, opts)).toEqual({ ok: false, code: 'used_before_too_many' });
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: true, usedBefore: 7 }, opts)).toMatchObject({ ok: true });
  });
});
