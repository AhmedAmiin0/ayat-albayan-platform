import { describe, expect, it } from 'vitest';
import { daysBefore, SALES_START_BACK_DAYS, salesStartDate } from './start-date.js';

const today = '2026-10-12';

describe('salesStartDate without subscriptions.set_start_date', () => {
  it('uses the default day when none is sent, or the default day itself', () => {
    expect(salesStartDate({ canSet: false, today })).toEqual({ ok: true, startsOn: today });
    expect(salesStartDate({ canSet: false, today, startsOn: today })).toEqual({ ok: true, startsOn: today });
  });

  it('refuses any other day and «already started»', () => {
    expect(salesStartDate({ canSet: false, today, startsOn: '2026-10-20' })).toEqual({ ok: false, code: 'start_date_not_allowed' });
    expect(salesStartDate({ canSet: false, today, startsOn: '2026-10-01', alreadyStarted: true })).toEqual({ ok: false, code: 'start_date_not_allowed' });
    expect(salesStartDate({ canSet: false, today, alreadyStarted: true })).toEqual({ ok: false, code: 'start_date_not_allowed' });
  });
});

describe('salesStartDate with subscriptions.set_start_date', () => {
  it('accepts today and any later day', () => {
    expect(salesStartDate({ canSet: true, today })).toEqual({ ok: true, startsOn: today });
    expect(salesStartDate({ canSet: true, today, startsOn: '2026-11-01' })).toEqual({ ok: true, startsOn: '2026-11-01' });
  });

  it('accepts a past day only with «already started»', () => {
    expect(salesStartDate({ canSet: true, today, startsOn: '2026-09-01' })).toEqual({ ok: false, code: 'start_date_past' });
    expect(salesStartDate({ canSet: true, today, startsOn: '2026-09-01', alreadyStarted: true })).toEqual({ ok: true, startsOn: '2026-09-01' });
  });

  it('caps the past at one year', () => {
    const edge = daysBefore(today, SALES_START_BACK_DAYS);
    expect(salesStartDate({ canSet: true, today, startsOn: edge, alreadyStarted: true })).toEqual({ ok: true, startsOn: edge });
    expect(salesStartDate({ canSet: true, today, startsOn: daysBefore(edge, 1), alreadyStarted: true })).toEqual({ ok: false, code: 'start_date_too_old' });
  });

  it('daysBefore counts calendar days', () => {
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28');
    expect(daysBefore(today, 365)).toBe('2025-10-12');
  });
});
