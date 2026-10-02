import { describe, expect, it } from 'vitest';
import { toTeacherReportView, type TeacherReportParts } from './teacher-reports.mapper';
import type { TeacherReportRow } from './teacher-reports.queries';

const NOW = new Date('2026-10-05T12:00:00Z');
const row = (submitted_at: string | null): TeacherReportRow => ({
  ...{ id: 'r1', lesson_id: 'l1', student_id: 's1', attendance: 'late', grade_overall: 'good' },
  ...{ status: 'submitted', submitted_at, pdf_status: null, sent_at: null },
});
const parts: TeacherReportParts = {
  lessons: new Map([['l1', '2026-10-04 14:00:00+00']]),
  students: new Map([['s1', { id: 's1', code: 'AB-0183', name: 'سهيلة' }]]),
  now: NOW,
  hours: 24,
};

describe('toTeacherReportView (R-REP-02 edit window)', () => {
  it.each([
    { name: 'submitted 1 h ago: editable until +24 h', at: '2026-10-05T11:00:00.000Z', can: true, until: '2026-10-06T11:00:00.000Z' },
    { name: 'the boundary instant is already closed', at: '2026-10-04T12:00:00.000Z', can: false, until: '2026-10-05T12:00:00.000Z' },
    { name: 'two days ago: view only', at: '2026-10-03T12:00:00.000Z', can: false, until: '2026-10-04T12:00:00.000Z' },
  ])('$name', ({ at, can, until }) => {
    expect(toTeacherReportView(row(at), parts)).toMatchObject({ can_edit: can, edit_until: until, submitted_at: at });
  });

  it('identity from the lesson and the student; a missing embed degrades to empty strings', () => {
    expect(toTeacherReportView(row('2026-10-05T11:00:00Z'), parts)).toMatchObject({
      starts_at: '2026-10-04T14:00:00.000Z',
      student: { id: 's1', code: 'AB-0183', name: 'سهيلة' },
    });
    const bare = toTeacherReportView(row(null), { ...parts, lessons: new Map(), students: new Map() });
    expect(bare).toMatchObject({ starts_at: '', student: { id: 's1', code: '', name: '' }, submitted_at: null, edit_until: null });
  });
});
