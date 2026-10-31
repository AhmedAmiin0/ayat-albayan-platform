import { COUNTS_FOR_MONEY } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '../../people/guardians/fake-db';
import { ReportPdfSource } from './report-pdf.source';

/** A clock before every fixture lesson: «الحلقة القادمة» is read after the lesson itself. */
const EPOCH = new Date(0);

const report = {
  id: 'r1',
  lesson_id: 'l1',
  student_id: 's1',
  teacher_id: 't1',
  attendance: 'late',
  version: 1,
};

function tables(over: Record<string, FakeResult[]> = {}): Record<string, FakeResult[]> {
  return {
    lesson_reports: [{ data: report }],
    lessons: [{ data: { starts_at: '2026-09-29T14:00:00+00:00', ends_at: '2026-09-29T15:00:00+00:00' } }],
    students: [
      {
        data: {
          name: 'سلمى',
          code: 'AB-0183',
          program: 'quran',
          guardians: { id: 'g1', phone_e164: '+966551234567', tz: 'Asia/Riyadh' },
        },
      },
    ],
    teachers: [{ data: { display_name_ar: 'هدى' } }],
    v_lesson_sequence: [{ data: null }],
    v_package_lessons: [{ data: { n: 6 } }],
    subscriptions: [{ data: [{ id: 'p1', lessons_total: 8, starts_on: '2026-09-01', created_at: '2026-09-01T08:00:00Z' }] }],
    lesson_students: [{ count: 4 }],
    ...over,
  };
}

describe('ReportPdfSource — one report and everything around it', () => {
  it('reads the lesson, student + guardian, teacher, sequence and packages', async () => {
    const { db, calls } = fakeDb(tables());
    const src = await new ReportPdfSource(db).load('r1', EPOCH);
    expect(src).toMatchObject({
      lesson: { starts_at: '2026-09-29T14:00:00+00:00' },
      student: { name: 'سلمى', code: 'AB-0183', program: 'quran' },
      guardian: { id: 'g1', tz: 'Asia/Riyadh' },
      teacher: { display_name_ar: 'هدى' },
      seq: null,
      completedBefore: 4,
      packageN: 6,
      packages: [{ id: 'p1', lessonsTotal: 8, startsOn: '2026-09-01', createdAt: '2026-09-01T08:00:00Z' }],
    });
    const count = calls.filter((c) => c.table === 'lesson_students');
    expect(count.find((c) => c.method === 'lt')?.args).toEqual(['lessons.starts_at', '2026-09-29T14:00:00+00:00']);
    expect(calls.find((c) => c.table === 'v_package_lessons' && c.method === 'match')?.args).toEqual([
      { lesson_id: 'l1', student_id: 's1' },
    ]);
  });

  it('skips the completed-before count when the lesson already has its sequence number', async () => {
    const { db, calls } = fakeDb(tables({ v_lesson_sequence: [{ data: { seq: 9 } }] }));
    const src = await new ReportPdfSource(db).load('r1', EPOCH);
    expect(src?.seq).toBe(9);
    expect(calls.some((c) => c.table === 'lesson_students')).toBe(false);
  });

  it('a stopped package keeps its slots (991): every package but an unused cancel', async () => {
    const stopped = { id: 'p0', lessons_total: 8, lessons_used_at_stop: 3, starts_on: '2026-08-01' };
    const { db, calls } = fakeDb(tables({ subscriptions: [{ data: [stopped] }] }));
    const src = await new ReportPdfSource(db).load('r1', EPOCH);
    expect(src?.packages).toMatchObject([{ id: 'p0', lessonsUsedAtStop: 3 }]);
    const subs = calls.filter((c) => c.table === 'subscriptions');
    expect(subs.find((c) => c.method === 'or')?.args).toEqual([COUNTS_FOR_MONEY]);
    expect(subs.some((c) => c.method === 'neq')).toBe(false);
  });

  it('no package unit for this lesson → packageN null', async () => {
    const { db } = fakeDb(tables({ v_package_lessons: [{ data: null }], subscriptions: [{ data: [] }] }));
    const src = await new ReportPdfSource(db).load('r1', EPOCH);
    expect(src?.packageN).toBeNull();
    expect(src?.packages).toEqual([]);
  });

  it('the lesson\'s rule package picks the CRM report kind: trial only for a trial rule (docs/19)', async () => {
    const lesson = (rule: { package: string } | null) => ({ lessons: [{ data: { starts_at: '2026-09-29T14:00:00+00:00', ends_at: '2026-09-29T15:00:00+00:00', rule } }] });
    const { db, calls } = fakeDb(tables(lesson({ package: 'trial' })));
    expect((await new ReportPdfSource(db).load('r1', EPOCH))?.lesson.trial).toBe(true);
    expect(calls.find((c) => c.table === 'lessons' && c.method === 'select')?.args[0]).toContain('rule:schedule_rules(package)');
    expect((await new ReportPdfSource(fakeDb(tables(lesson({ package: 'monthly' }))).db).load('r1', EPOCH))?.lesson.trial).toBe(false);
    expect((await new ReportPdfSource(fakeDb(tables(lesson(null))).db).load('r1', EPOCH))?.lesson.trial).toBe(false);
  });

  it('a deleted report → null; a missing student or a read error → throws', async () => {
    await expect(new ReportPdfSource(fakeDb(tables({ lesson_reports: [{ data: null }] })).db).load('r1', EPOCH)).resolves.toBeNull();
    await expect(new ReportPdfSource(fakeDb(tables({ students: [{ data: null }] })).db).load('r1', EPOCH)).rejects.toThrow(
      'student not found',
    );
    await expect(
      new ReportPdfSource(fakeDb(tables({ teachers: [{ error: { message: 'down' } }] })).db).load('r1', EPOCH),
    ).rejects.toThrow('teacher read failed: down');
  });
});
