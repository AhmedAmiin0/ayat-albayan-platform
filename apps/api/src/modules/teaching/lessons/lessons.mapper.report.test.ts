import { describe, expect, it } from 'vitest';
import { LESSON_SELECT } from './store/lesson-row';
import { toLessonView } from './lessons.mapper';
import { lessonRow } from './lessons.fakes';

const NOW = new Date('2026-11-11T10:10:00Z');
const ctx = { role: 'teacher' as const, seq: new Map<string, number>(), reportMinutes: 30, now: NOW };
const student = { student_id: 's1', attendance: null, chargeable: true, student: { id: 's1', code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh' } };
type Embed = { id: string; status: 'draft' | 'submitted'; submitted_at?: string | null; sent_at?: string | null };

const report = (r: Embed | null | undefined, over: Partial<typeof ctx> = {}) =>
  toLessonView(lessonRow({ lesson_students: [{ ...student, ...(r === undefined ? {} : { report: r }) }] }), { ...ctx, ...over })
    .students[0]?.report;

describe('toLessonView — each student’s report state (the lesson details sheet, docs/46 B7)', () => {
  it('the select embeds the report id, status, first submit and family send, through lesson_students', () => {
    expect(LESSON_SELECT).toContain('report:lesson_reports(id, status, submitted_at, sent_at)');
  });

  it('a submitted report inside its window: can_edit, edit_until = first submit + minutes, not sent', () => {
    expect(report({ id: 'r1', status: 'submitted', submitted_at: '2026-11-11 10:00:00+00', sent_at: null })).toEqual({
      id: 'r1', status: 'submitted', submitted_at: '2026-11-11T10:00:00.000Z', sent_at: null,
      can_edit: true, edit_until: '2026-11-11T10:30:00.000Z',
    });
  });

  it('the stored window applies (10 min: closed by now); the admin still edits', () => {
    const row = { id: 'r1', status: 'submitted' as const, submitted_at: '2026-11-11 10:00:00+00', sent_at: null };
    expect(report(row, { reportMinutes: 10 })).toMatchObject({ can_edit: false, edit_until: '2026-11-11T10:10:00.000Z' });
    expect(report(row, { reportMinutes: 10, role: 'admin' as never })).toMatchObject({ can_edit: true });
  });

  it('a draft: editable, no window; none (or an old fake) → null', () => {
    expect(report({ id: 'r2', status: 'draft' })).toMatchObject({ id: 'r2', status: 'draft', can_edit: true, edit_until: null });
    expect(report(null)).toBeNull();
    expect(report(undefined)).toBeNull();
  });
});
