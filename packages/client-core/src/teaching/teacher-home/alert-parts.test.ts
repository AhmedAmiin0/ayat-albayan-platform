import { describe, expect, it } from 'vitest';
import { bellRow, lesson, TZ } from './alerts-fixture.js';
import { alertParts, type PartsOptions } from './alert-parts.js';
import type { TodayAlert } from './today-alerts.js';

const O: PartsOptions = { clock: { tz: TZ, cycle: '24', locale: 'ar' }, names: () => 'سهيلة' };
const L = lesson({ id: 'a' }); // 16:00 Riyadh
const change = (c: Partial<Extract<TodayAlert, { kind: 'changed' }>['change']>): TodayAlert => ({
  kind: 'changed',
  key: 'k',
  lesson: L,
  change: { who: 'moved', reason: null, from: null, to: null, ...c },
});

describe('alertParts', () => {
  it('soon: the minutes left; opens the lesson', () => {
    const p = alertParts({ kind: 'soon', key: 'k', lesson: L, minutes: 9 }, O);
    expect(p).toEqual({ text: 'soon', vars: { names: 'سهيلة', time: '16:00', minutes: '9' }, detail: null, action: 'open' });
  });

  it('confirm opens the lesson', () => {
    expect(alertParts({ kind: 'confirm', key: 'k', lesson: L }, O)).toMatchObject({ text: 'confirm', action: 'open' });
  });

  it('report carries the stage and opens the report', () => {
    const p = alertParts({ kind: 'report', key: 'k', lesson: L, stage: 'resume' }, O);
    expect(p).toMatchObject({ text: 'report', action: 'report', vars: { stage: 'resume' } });
  });

  it('a change picks who and where, with the reason as the second line', () => {
    expect(alertParts(change({ who: 'teacher', reason: 'سفر' }), O)).toMatchObject({
      text: 'cancelledTeacher',
      detail: 'سفر',
    });
    expect(alertParts(change({ who: 'admin' }), O).text).toBe('cancelledAdmin');
    const to = alertParts(change({ to: '2026-11-15T13:00:00Z' }), O);
    expect(to.text).toBe('movedTo');
    expect(to.vars.to).toContain('16:00');
    expect(alertParts(change({ from: '2026-11-13T13:00:00Z' }), O).text).toBe('movedFrom');
    expect(alertParts(change({}), O)).toMatchObject({ text: 'movedAway', vars: { to: '', from: '' } });
  });

  it('a bell row shows its title and body and is marked read', () => {
    const p = alertParts({ kind: 'bell', key: 'k', item: bellRow({ id: 'n', title: 'ت', body: 'ب' }) }, O);
    expect(p).toEqual({ text: 'bell', vars: { title: 'ت' }, detail: 'ب', action: 'read' });
  });
});
