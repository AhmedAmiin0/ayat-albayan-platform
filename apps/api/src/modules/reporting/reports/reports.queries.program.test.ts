import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { ReportsQueries } from './reports.queries';
import { lessonRow, STUDENT_ID } from './reports.fakes';

describe('ReportsQueries.ensureDrafts — «البرنامج *» prefill', () => {
  it('each draft starts with the student’s program (the teacher may change it afterwards)', async () => {
    const lesson = lessonRow();
    const [first] = lesson.lesson_students;
    if (!first?.student) throw new Error('fixture');
    lesson.lesson_students = [
      { ...first, student: { ...first.student, program: 'arabic' } },
      { ...first, student_id: 'sibling', student: { ...first.student, id: 'sibling', program: 'islamic_studies' } },
    ];
    const { db, argsOf } = fakeDb({ lesson_reports: [{}] });
    await new ReportsQueries(db).ensureDrafts(lesson, 'actor');
    const [rows, options] = argsOf('lesson_reports', 'upsert') ?? [];
    expect(rows).toMatchObject([
      { student_id: STUDENT_ID, program: 'arabic' },
      { student_id: 'sibling', program: 'islamic_studies' },
    ]);
    expect(options).toMatchObject({ ignoreDuplicates: true });
  });
});
