// A7 duplicate submissions on invented parsed reports.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { dedupe } from './dedupe.ts';
import type { ParsedReport } from './parse.ts';

const S = keys.student({ guardianPhone: '+966551110001', name: 'ليان' });
const L = keys.lesson({ teacher: 'abrar', students: [S.key], at: '2026-08-19' });

function rep(o: { row: number; at: string; lessonNo?: string; recited?: string }): ParsedReport {
  return {
    ref: { source: 'HUB', tab: 't', row: o.row },
    teacher: 'abrar',
    student: S,
    date: '2026-08-19',
    startsAt: '2026-08-19T09:00:00.000Z',
    endsAt: '2026-08-19T09:45:00.000Z',
    attendance: 'on_time',
    trial: false,
    lessonNo: o.lessonNo ?? 'الخامسه',
    names: ['ليان'],
    sent: true,
    meetingLink: null,
    submittedAt: o.at,
    body: { recited: o.recited ?? 'سورة الملك' },
    lessonKey: L,
    reportKey: keys.lessonReport({ lesson: L.key, student: S.key }),
    issues: [],
  };
}

describe('dedupe (A7)', () => {
  it('identical resubmission: first kept, later one warned', () => {
    const d = dedupe([
      rep({ row: 2, at: '2026-08-19T16:39:00Z' }),
      rep({ row: 3, at: '2026-08-19T18:53:00Z' }),
    ]);
    expect(d.reports.map((r) => r.ref.row)).toEqual([2]);
    expect(d.issues).toMatchObject([
      { code: 'duplicate', severity: 'warn', ref: { row: 3 }, detail: 'kept=HUB:2' },
    ]);
  });

  it('corrected resubmission (same lesson number): latest kept, older to review', () => {
    const d = dedupe([
      rep({ row: 4, at: '2026-08-19T18:00:00Z', recited: 'تصحيح' }),
      rep({ row: 2, at: '2026-08-19T16:00:00Z' }),
    ]);
    expect(d.reports.map((r) => r.ref.row)).toEqual([4]);
    expect(d.issues).toMatchObject([{ code: 'conflict', severity: 'review', ref: { row: 2 } }]);
  });

  it('another lesson typed with the same date: kept as its own lesson, date to review', () => {
    const d = dedupe([
      rep({ row: 2, at: '2026-08-19T16:00:00Z', lessonNo: 'الرابعه' }),
      rep({ row: 3, at: '2026-08-25T16:00:00Z', lessonNo: 'الخامسه', recited: 'سورة القلم' }),
    ]);
    expect(d.reports.map((r) => r.lessonKey.key)).toEqual([L.key, `abrar|${S.key}|2026-08-19#2`]);
    expect(d.reports[1]?.reportKey.key).toBe(`abrar|${S.key}|2026-08-19#2|${S.key}`);
    expect(d.issues).toMatchObject([
      {
        code: 'conflict',
        severity: 'review',
        field: 'lesson_date',
        detail: 'same_day_lesson=2',
        ref: { row: 3 },
      },
    ]);
  });

  it('another lesson number sent within 30 minutes is a correction, not a second lesson', () => {
    const d = dedupe([
      rep({ row: 2, at: '2026-08-19T16:00:00Z', lessonNo: 'الرابعه' }),
      rep({ row: 3, at: '2026-08-19T16:11:00Z', lessonNo: 'الخامسه', recited: 'تصحيح' }),
    ]);
    expect(d.reports.map((r) => [r.ref.row, r.lessonKey.key])).toEqual([[3, L.key]]);
    expect(d.issues).toMatchObject([{ code: 'conflict', severity: 'review', ref: { row: 2 } }]);
  });

  it('different students or days never collapse', () => {
    const other = {
      ...rep({ row: 5, at: '2026-08-19T16:00:00Z' }),
      reportKey: keys.lessonReport({ lesson: 'x', student: S.key }),
    };
    const d = dedupe([rep({ row: 2, at: '2026-08-19T16:00:00Z' }), other]);
    expect(d.reports).toHaveLength(2);
    expect(d.issues).toEqual([]);
  });
});
