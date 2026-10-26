import { describe, expect, it } from 'vitest';
import { LESSON_SELECT } from './store/lesson-row';
import { toLessonView } from './lessons.mapper';
import { lessonRow } from './lessons.fakes';

const ctx = { role: 'teacher' as const, seq: new Map<string, number>() };
const student = { student_id: 's1', attendance: null, chargeable: true, student: { id: 's1', code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh' } };

describe('toLessonView — each student’s report state (the lesson details sheet)', () => {
  it('the select embeds the report id and status only, through lesson_students', () => {
    expect(LESSON_SELECT).toContain('report:lesson_reports(id, status)');
  });

  it('a submitted or draft report comes back as { id, status }; none (or an old fake) → null', () => {
    const report = (r: { id: string; status: 'draft' | 'submitted' } | null | undefined) =>
      toLessonView(lessonRow({ lesson_students: [{ ...student, ...(r === undefined ? {} : { report: r }) }] }), ctx).students[0]?.report;
    expect(report({ id: 'r1', status: 'submitted' })).toEqual({ id: 'r1', status: 'submitted' });
    expect(report({ id: 'r2', status: 'draft' })).toEqual({ id: 'r2', status: 'draft' });
    expect(report(null)).toBeNull();
    expect(report(undefined)).toBeNull();
  });
});
