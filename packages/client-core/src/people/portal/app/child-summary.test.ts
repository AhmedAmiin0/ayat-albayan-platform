import type { PortalLessons, PortalReport } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { childSummary, reportAt, reportMonths } from './child-summary';

const report = (id: string, startsAt: string | null): PortalReport => ({
  id, lesson_id: `l-${id}`, lesson_starts_at: startsAt, sent_at: '2026-11-02T10:00:00.000Z',
  teacher: null, recording_id: null,
});
const lessons: PortalLessons = {
  lessons: [
    {
      id: 'l1', starts_at: '2026-11-16T15:30:00.000Z', ends_at: '2026-11-16T16:15:00.000Z',
      status: 'confirmed', teacher: { display_name_ar: 'فاطمة', display_name_en: null },
      way_in: 'classroom', meeting_url: null,
      window: { state: 'early', opens_at: '2026-11-16T15:20:00.000Z', closes_at: '2026-11-16T16:45:00.000Z' },
    },
  ],
  prepare: null,
  month: { attended: 7, absent: 1 },
};
const now = new Date('2026-11-15T10:00:00.000Z');

describe('childSummary', () => {
  it('counts what is ahead, this month, what is left and the new reports', () => {
    const reports = { reports: [report('r2', '2026-11-13T15:30:00.000Z'), report('r1', null)] };
    const pkg = { package: null, payments: [], payment_instructions: '' };
    const s = childSummary({ lessons, reports, pkg, seen: ['r1'] }, now);
    expect(s).toMatchObject({ upcoming: 1, month: { attended: 7, absent: 1 }, newReports: 1 });
    expect(s.remaining).toBeNull();
    expect(s.lastReport?.id).toBe('r2');
  });

  it('nothing known while the reads load', () => {
    const none = { lessons: undefined, reports: undefined, pkg: undefined, seen: [] };
    expect(childSummary(none, now)).toEqual({
      upcoming: null, month: null, remaining: null, lastReport: null, newReports: 0,
    });
  });
});

describe('reportMonths', () => {
  it("groups by the lesson's month, else the sending day", () => {
    expect(reportAt(report('r1', null))).toBe('2026-11-02T10:00:00.000Z');
    const rows = [report('a', '2026-11-13T15:30:00.000Z'), report('b', '2026-10-30T15:30:00.000Z')];
    const months = reportMonths(rows, 'UTC');
    expect(months.map((m) => [m.month, m.rows.length])).toEqual([['2026-11', 1], ['2026-10', 1]]);
  });
});
