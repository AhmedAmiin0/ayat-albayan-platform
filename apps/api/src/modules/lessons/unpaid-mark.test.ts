import type { LessonView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { LESSON_ID, lessonRow, STUDENT_ID } from './lessons.fakes';
import { toLessonView } from './lessons.mapper';
import { markUnpaid, upcomingStudentIds } from './unpaid-mark';

const NOW = Date.parse('2026-10-02T09:00:00Z');
const SIBLING = '00000000-0000-4000-8000-0000000000c9';
const sibling = { student_id: SIBLING, attendance: null, chargeable: true, student: { id: SIBLING, code: 'AB-0184', name: 'مريم', tz: 'Asia/Riyadh' } };
const twoStudents = lessonRow({ lesson_students: [...lessonRow().lesson_students, sibling] });
const view = (over: Parameters<typeof lessonRow>[0] = {}): LessonView =>
  toLessonView({ ...twoStudents, ...over }, { role: 'admin', seq: new Map() });

describe('upcomingStudentIds (R-SUB-02)', () => {
  it('takes the students of open lessons that have not started', () => {
    const rows = [
      twoStudents,
      lessonRow({ id: 'past', starts_at: '2026-10-01T14:00:00+00:00' }),
      lessonRow({ id: 'done', status: 'completed' }),
      lessonRow({ id: 'cancelled', status: 'cancelled_by_admin' }),
    ];
    expect(upcomingStudentIds(rows, NOW)).toEqual([STUDENT_ID, SIBLING]);
  });
});

describe('markUnpaid (R-SUB-02)', () => {
  it('flags only the flagged student of an upcoming open lesson', () => {
    const marked = markUnpaid(view(), new Set([SIBLING]), NOW);
    expect(marked.students.map((s) => [s.id, s.unpaid])).toEqual([
      [STUDENT_ID, undefined],
      [SIBLING, true],
    ]);
  });

  it('never marks a makeup: it consumes no package unit (R-SCH-10)', () => {
    const makeup = view({ makeup_of_id: LESSON_ID });
    expect(markUnpaid(makeup, new Set([STUDENT_ID, SIBLING]), NOW)).toBe(makeup);
  });

  it('leaves started, ended and cancelled lessons alone', () => {
    const flagged = new Set([STUDENT_ID, SIBLING]);
    for (const v of [
      view({ starts_at: '2026-10-02T08:59:00+00:00' }),
      view({ status: 'completed' }),
      view({ status: 'cancelled_by_admin' }),
    ]) {
      expect(markUnpaid(v, flagged, NOW)).toBe(v);
    }
  });

  it('returns the same view when nobody on it is flagged', () => {
    const v = view();
    expect(markUnpaid(v, new Set(), NOW)).toBe(v);
    expect(markUnpaid(v, new Set(['someone-else']), NOW)).toBe(v);
  });
});
