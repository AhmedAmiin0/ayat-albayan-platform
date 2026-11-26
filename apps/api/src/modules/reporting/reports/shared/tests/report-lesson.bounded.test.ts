import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { ReportLessonQueries } from '@/modules/reporting/reports/shared/report-lesson.queries';

const LESSON = { id: 'l1', starts_at: '2026-11-25T10:00:00Z' };
const content = (to: number) => ({
  segments: [{ kind: 'new', surah: 67, from: 1, to, grade: 'good' }],
});
const report = (id: string, studentId: string, to: number) => ({
  id,
  student_id: studentId,
  form_version: 2,
  content: content(to),
});
const HEAD_COUNT = ['lesson_id', { count: 'exact', head: true }];

describe('ReportLessonQueries.lessonNumbers counts earlier lessons, never reads them', () => {
  it('asks a head count per student without a sequence and adds one', async () => {
    const { db, trips, calls } = fakeDb({
      v_lesson_sequence: [{ data: [{ student_id: 's1', seq: 7 }] }, { count: 2 }, { count: 0 }],
    });
    const out = await new ReportLessonQueries(db).lessonNumbers(LESSON, ['s1', 's2', 's3']);
    expect(out).toEqual(new Map([['s1', 7], ['s2', 3], ['s3', 1]]));
    expect(trips).toEqual(['v_lesson_sequence', 'v_lesson_sequence', 'v_lesson_sequence']);
    const selects = calls.filter((c) => c.method === 'select').map((c) => c.args);
    expect(selects.slice(1)).toEqual([HEAD_COUNT, HEAD_COUNT]);
    expect(calls.filter((c) => c.method === 'range')).toEqual([]);
  });

  it('makes no count when every student has a sequence', async () => {
    const { db, trips } = fakeDb({
      v_lesson_sequence: [{ data: [{ student_id: 's1', seq: 2 }] }],
    });
    const out = await new ReportLessonQueries(db).lessonNumbers(LESSON, ['s1']);
    expect(out).toEqual(new Map([['s1', 2]]));
    expect(trips).toEqual(['v_lesson_sequence']);
  });
});

describe('ReportLessonQueries.memory reads a bounded history per student', () => {
  it('limits each student to thirty reports plus the excluded ones', async () => {
    const { db, calls } = fakeDb({
      lesson_reports: [{ data: [report('a1', 's1', 30), report('a2', 's1', 20)] }, { data: [] }],
    });
    await new ReportLessonQueries(db).memory(['s1', 's2'], ['a1']);
    const limits = calls.filter((c) => c.method === 'limit').map((c) => c.args);
    expect(limits).toEqual([[31], [31]]);
    const students = calls.filter((c) => c.args[0] === 'student_id').map((c) => c.args[1]);
    expect(students).toEqual(['s1', 's2']);
  });

  it('keeps each history apart and drops the reports on this form', async () => {
    const { db } = fakeDb({
      lesson_reports: [
        { data: [report('a1', 's1', 30), report('a2', 's1', 20)] },
        { data: [report('b1', 's2', 9)] },
        { data: [] },
      ],
    });
    const out = await new ReportLessonQueries(db).memory(['s1', 's2', 's3'], ['a1']);
    expect(out.get('s1')?.last.new).toEqual({ surah: 67, from: 1, to: 20 });
    expect(out.get('s2')?.last.new).toEqual({ surah: 67, from: 1, to: 9 });
    expect(out.get('s3')?.last.new).toBeNull();
  });
});
