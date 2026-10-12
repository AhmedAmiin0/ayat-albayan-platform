import { describe, expect, it } from 'vitest';
import { startBody } from './start-body';

const today = '2026-10-12';

describe('startBody: the start fields sent with POST /sales/subscriptions', () => {
  it('without the permission nothing is sent (the API default day), whatever the form holds', () => {
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: true }, { canSet: false, today })).toEqual({ ok: true, body: {} });
  });

  it('with it: a later day as is, alreadyStarted only when ticked, an empty day is today', () => {
    expect(startBody({ startsOn: '2026-11-01', alreadyStarted: false }, { canSet: true, today })).toEqual({ ok: true, body: { startsOn: '2026-11-01' } });
    expect(startBody({ startsOn: '', alreadyStarted: false }, { canSet: true, today })).toEqual({ ok: true, body: { startsOn: today } });
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: true }, { canSet: true, today })).toEqual({
      ok: true,
      body: { startsOn: '2026-09-01', alreadyStarted: true },
    });
  });

  it('a past day needs the box, and at most a year back', () => {
    expect(startBody({ startsOn: '2026-09-01', alreadyStarted: false }, { canSet: true, today })).toEqual({ ok: false, code: 'start_date_past' });
    expect(startBody({ startsOn: '2025-09-01', alreadyStarted: true }, { canSet: true, today })).toEqual({ ok: false, code: 'start_date_too_old' });
  });
});
