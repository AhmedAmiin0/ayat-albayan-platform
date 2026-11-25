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

describe('ReportLessonQueries reads a lesson’s students in one batched read', () => {
  it('counts the earlier lessons of every student without a sequence in one read', async () => {
    const { db, trips } = fakeDb({
      v_lesson_sequence: [
        { data: [{ student_id: 's1', seq: 7 }] },
        { data: [{ student_id: 's2' }, { student_id: 's2' }, { student_id: 's3' }] },
      ],
    });
    const out = await new ReportLessonQueries(db).lessonNumbers(LESSON, ['s1', 's2', 's3', 's4']);
    expect(out).toEqual(new Map([['s1', 7], ['s2', 3], ['s3', 2], ['s4', 1]]));
    expect(trips).toEqual(['v_lesson_sequence', 'v_lesson_sequence']);
  });

  it('makes no second read when every student has a sequence', async () => {
    const { db, trips } = fakeDb({
      v_lesson_sequence: [{ data: [{ student_id: 's1', seq: 2 }] }],
    });
    const out = await new ReportLessonQueries(db).lessonNumbers(LESSON, ['s1']);
    expect(out).toEqual(new Map([['s1', 2]]));
    expect(trips).toEqual(['v_lesson_sequence']);
  });

  it('reads the memory of every student in one read and keeps each history apart', async () => {
    const rows = [report('a1', 's1', 30), report('a2', 's1', 20), report('b1', 's2', 9)];
    const { db, trips, calls } = fakeDb({ lesson_reports: [{ data: rows }] });
    const out = await new ReportLessonQueries(db).memory(['s1', 's2', 's3'], ['a1']);
    expect(trips).toEqual(['lesson_reports']);
    expect(calls.find((c) => c.method === 'in')?.args).toEqual(['student_id', ['s1', 's2', 's3']]);
    expect(out.get('s1')?.last.new).toEqual({ surah: 67, from: 1, to: 20 });
    expect(out.get('s2')?.last.new).toEqual({ surah: 67, from: 1, to: 9 });
    expect(out.get('s3')?.last.new).toBeNull();
  });

  it('looks no deeper than thirty reports per student, as the per-student read did', async () => {
    const many = Array.from({ length: 31 }, (_, i) => report(`r${i}`, 's1', 31 - i));
    const blank = many.slice(0, 30).map((r) => ({ ...r, content: {} }));
    const { db } = fakeDb({ lesson_reports: [{ data: [...blank, ...many.slice(30)] }] });
    const out = await new ReportLessonQueries(db).memory(['s1'], []);
    expect(out.get('s1')?.last.new).toBeNull();
  });
});
