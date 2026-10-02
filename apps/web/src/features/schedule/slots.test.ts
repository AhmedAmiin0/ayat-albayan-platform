import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { bookableWindow, byLocalDay, currentWeekStart, zoneLabel } from './slots';
import { RIYADH_TZ } from './tz';

const slot = (starts_at: string) => ({ starts_at, ends_at: starts_at, conflicts: [] });

describe('slot grid helpers (R-SCH-06, R-SCH-01)', () => {
  it('byLocalDay groups by the Riyadh day, sorted', () => {
    const days = byLocalDay([slot('2026-10-04T15:00:00Z'), slot('2026-10-03T22:00:00Z'), slot('2026-10-04T13:00:00Z')], RIYADH_TZ);
    expect([...days.keys()]).toEqual(['2026-10-04']);
    expect(days.get('2026-10-04')?.map((s) => s.starts_at)).toEqual([
      '2026-10-03T22:00:00Z',
      '2026-10-04T13:00:00Z',
      '2026-10-04T15:00:00Z',
    ]);
  });

  it('currentWeekStart is the Riyadh Saturday (Friday 22:00Z is already Saturday in Riyadh)', () => {
    expect(currentWeekStart(new Date('2026-10-07T10:00:00Z'))).toBe('2026-10-03');
    expect(currentWeekStart(new Date('2026-10-09T22:00:00Z'))).toBe('2026-10-10');
  });

  it('bookableWindow starts now inside the current week and is null for a past week', () => {
    const now = new Date('2026-10-07T10:00:00Z');
    expect(bookableWindow('2026-10-03', now)).toEqual({ from: now, to: new Date('2026-10-09T21:00:00Z') });
    expect(bookableWindow('2026-10-10', now)?.from.toISOString()).toBe('2026-10-09T21:00:00.000Z');
    expect(bookableWindow('2026-09-26', now)).toBeNull();
  });

  it('zoneLabel shows the student wall clock, with the weekday when the day differs', () => {
    expect(zoneLabel('2026-10-04T14:00:00Z', { tz: RIYADH_TZ, base: RIYADH_TZ })).toBeNull();
    expect(zoneLabel('2026-12-06T14:00:00Z', { tz: 'Africa/Cairo', base: RIYADH_TZ })).toBe('16:00');
    // Kuwait, and Cairo in summer, read the same clock as Riyadh: nothing to add.
    expect(zoneLabel('2026-12-06T14:00:00Z', { tz: 'Asia/Kuwait', base: RIYADH_TZ })).toBeNull();
    expect(zoneLabel('2026-10-04T14:00:00Z', { tz: 'Africa/Cairo', base: RIYADH_TZ })).toBeNull();
    // 01:00 Sunday in Riyadh is 18:00 Saturday in New York.
    expect(zoneLabel('2026-10-03T22:00:00Z', { tz: 'America/New_York', base: RIYADH_TZ })).toBe(
      `18:00 ${t.enums.weekday[6]}`,
    );
  });
});
