import { describe, expect, it } from 'vitest';
import { formResponse } from './report-form.mapper';
import { AFTER, lessonRow, reportRow, STUDENT_ID } from './reports.fakes';

const ctx = { role: 'teacher' as const, now: AFTER, hours: 24 };

describe('formResponse (R-REP-01)', () => {
  it('a student without a report row yet is left out; missing number reads 1, no package → null', () => {
    const out = formResponse({ lesson: lessonRow(), reports: [], numbers: new Map(), packages: new Map(), ctx, block: null });
    expect(out.entries).toEqual([]);
    const one = formResponse({ lesson: lessonRow(), reports: [reportRow()], numbers: new Map(), packages: new Map(), ctx, block: null });
    expect(one.entries[0]).toMatchObject({ lesson_no: 1, package: null, student: { id: STUDENT_ID } });
  });

  it('a lesson whose teacher embed is missing keeps the teacher id', () => {
    const out = formResponse({ lesson: lessonRow({ teacher: null }), reports: [], numbers: new Map(), packages: new Map(), ctx, block: 'not_started' });
    expect(out.lesson.teacher.id).toBe(lessonRow().teacher_id);
    expect(out.submit_block).toBe('not_started');
  });
});
