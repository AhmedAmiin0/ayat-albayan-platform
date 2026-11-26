import {
  attendanceKindSchema,
  COURSE_PAUSE_REASON,
  portalOutcomeSchema,
  type AttendanceKind,
  type PortalOutcome,
} from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { pastRow } from '@/modules/people/portal/portal.family.fakes';
import { monthCounts, outcomeOf, pickFor, toHistoryRow } from './portal-history.mapper';

const refs = (reports: [string, string][] = [], recordings: [string, string][] = []) => ({
  reports: new Map(reports),
  recordings: new Map(recordings),
});

describe('portal history mapper (docs/50 §5)', () => {
  it('the outcome is staff\'s attendanceKind: present, absent, excused; else in no list', () => {
    const cases = [
      [pastRow('l-01', { attendance: 'on_time' }), 'attended'],
      [pastRow('l-02', { attendance: 'late' }), 'attended'],
      [pastRow('l-03'), 'attended'],
      [pastRow('l-04', { status: 'no_show' }), 'absent'],
      [pastRow('l-05', { status: 'confirmed', attendance: 'absent' }), 'absent'],
      [pastRow('l-06', { status: 'excused' }), 'excused'],
      [pastRow('l-07', { attendance: 'excused' }), 'excused'],
      [pastRow('l-08', { status: 'cancelled_by_admin' }), null],
      [pastRow('l-09', { status: 'scheduled' }), null],
      [pastRow('l-10', { status: 'rescheduled' }), null],
      [pastRow('l-11', { status: 'scheduled', own: [] }), null],
    ] as const;
    for (const [row, want] of cases) expect([row.id, outcomeOf(row)]).toEqual([row.id, want]);
  });

  it('«غاب عنها» holds the absent and excused lessons; «حضرها» the attended ones', () => {
    const rows = [pastRow('l-01'), pastRow('l-02', { status: 'no_show' }), pastRow('l-03', { status: 'excused' })];
    expect(rows.flatMap(pickFor('attended')).map((r) => r.id)).toEqual(['l-01']);
    expect(rows.flatMap(pickFor('absent')).map((r) => [r.id, r.outcome])).toEqual([
      ['l-02', 'absent'],
      ['l-03', 'excused'],
    ]);
  });

  it('month counts: absent includes excused; cancelled and unmarked count nowhere', () => {
    const rows = [
      pastRow('l-01'), pastRow('l-02', { attendance: 'late' }), pastRow('l-03', { status: 'no_show' }),
      pastRow('l-04', { status: 'excused' }), pastRow('l-05', { status: 'cancelled_by_teacher' }),
      pastRow('l-06', { status: 'scheduled' }),
    ];
    expect(monthCounts(rows)).toEqual({ attended: 2, absent: 2 });
    expect(monthCounts([])).toEqual({ attended: 0, absent: 0 });
  });

  it('whitelists the row: the family\'s excuse only, the sent report and its visible recording', () => {
    const [excused] = pickFor('absent')(pastRow('l-01', { status: 'excused', cancel_reason: 'مرض' }));
    if (!excused) throw new Error('excused lesson expected');
    const row = toHistoryRow(excused, refs([['l-01', 'r1']], [['l-01', 'rec']]));
    expect(row).toEqual({
      lesson_id: 'l-01', starts_at: '2026-10-01T16:00:00.000Z', ends_at: '2026-10-01T16:30:00.000Z',
      teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' }, outcome: 'excused',
      absence_reason: 'مرض', report_id: 'r1', recording_id: 'rec',
    });
    expect(Object.keys(row)).not.toContain('cancel_reason');
  });

  it('no report: no recording either; a pause or a missing teacher hides what it must', () => {
    const [paused] = pickFor('absent')(
      pastRow('l-02', { status: 'excused', cancel_reason: COURSE_PAUSE_REASON, teacher: null }),
    );
    if (!paused) throw new Error('excused lesson expected');
    const row = toHistoryRow(paused, refs([], [['l-02', 'rec']]));
    expect([row.absence_reason, row.report_id, row.recording_id]).toEqual([null, null, null]);
    expect(row.teacher).toEqual({ display_name_ar: '', display_name_en: null });
  });
});

describe('the outcome table as a zod record (docs/62 part 2 §1)', () => {
  const schema = z.record(attendanceKindSchema, portalOutcomeSchema.nullable()).readonly();
  const full = { present: 'attended', absent: 'absent', excused: 'excused', cancelled: null };

  it('needs every attendance kind, with null for no outcome', () => {
    expectTypeOf<z.input<typeof schema>>().toEqualTypeOf<
      Readonly<Record<AttendanceKind, PortalOutcome | null>>
    >();
  });

  it('refuses a missing kind, a wrong outcome and an extra key', () => {
    expect(() => schema.parse(full)).toThrow();
    expect(() => schema.parse({ ...full, unmarked: null, present: 'here' })).toThrow();
    expect(() => schema.parse({ ...full, unmarked: null, late: null })).toThrow();
    expect(schema.parse({ ...full, unmarked: null })).toEqual({ ...full, unmarked: null });
  });
});
