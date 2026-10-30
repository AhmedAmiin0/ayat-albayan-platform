import { expect, test } from '@playwright/test';
import type { TransactionSql } from 'postgres';
import { withSql } from '../../support/schedule';
import { USERS } from '../../support/users';

// submit_report (migrations 130 + 131) against the real database, in a transaction that is rolled
// back: a report re-derives the lesson's outcome from all its students' attendance (R-REP-03),
// so payouts (R-PAY-02) and «رقم الحلقة» (v_lesson_sequence, R-LES-03) follow a corrected report.
// The payloads have the shape the API's submitPayload builds (lesson_change on the first report of
// an open lesson, student afterwards).

type Tx = TransactionSql;
type Attendance = 'on_time' | 'late' | 'excused' | 'absent';

const ROLLBACK = new Error('rollback');
const STATUS: Record<Attendance, string> = { on_time: 'completed', late: 'late', excused: 'excused', absent: 'no_show' };

async function rolledBack(run: (tx: Tx) => Promise<void>): Promise<void> {
  await withSql(async (sql) => {
    await sql.begin(async (tx) => {
      await run(tx);
      throw ROLLBACK;
    }).catch((e: unknown) => {
      if (e !== ROLLBACK) throw e;
    });
  });
}

/** A lesson that started an hour ago with `students` and one draft report per student. */
async function seed(tx: Tx, students: number) {
  const [teacher] = await tx<{ id: string; profile_id: string }[]>`
    select t.id, t.profile_id from public.teachers t join auth.users u on u.id = t.profile_id
    where u.email = ${USERS.teacher.email}`;
  if (!teacher) throw new Error('e2e teacher missing (global setup)');
  const [g] = await tx<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
    values ('ولي أمر SQL', '+966500000999', 'SA', 'Asia/Riyadh') returning id`;
  const [lesson] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at)
    values (${teacher.id}, now() - interval '1 hour', now() - interval '15 minutes') returning id`;
  if (!g || !lesson) throw new Error('seed failed');
  const reports: { id: string; student: string }[] = [];
  for (let i = 0; i < students; i++) {
    const [s] = await tx<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz)
      values (${g.id}, ${`طالب ${i}`}, ${`طالب ${i}`}, 'Asia/Riyadh') returning id`;
    if (!s) throw new Error('student not written');
    await tx`insert into public.lesson_students (lesson_id, student_id) values (${lesson.id}, ${s.id})`;
    const [r] = await tx<{ id: string }[]>`insert into public.lesson_reports (lesson_id, student_id, teacher_id)
      values (${lesson.id}, ${s.id}, ${teacher.id}) returning id`;
    if (r) reports.push({ id: r.id, student: s.id });
  }
  return { actor: teacher.profile_id, lessonId: lesson.id, reports };
}

type Seeded = Awaited<ReturnType<typeof seed>>;

/** One submit: the first report of an open lesson moves it (siblings follow), later ones sync. */
async function submit(tx: Tx, input: { s: Seeded; index: number; attendance: Attendance; version: number }) {
  const { s, attendance, version } = input;
  const report = s.reports[input.index];
  if (!report) throw new Error('no such report');
  const chargeable = attendance !== 'excused';
  const [lesson] = await tx<{ status: string }[]>`select status from public.lessons where id = ${s.lessonId}`;
  const open = lesson?.status === 'scheduled';
  const change = { id: s.lessonId, from_status: 'scheduled', to_status: STATUS[attendance], attendance, chargeable,
    students: [{ student_id: report.student, attendance, chargeable }] };
  const p = {
    report_id: report.id,
    expected_version: version,
    actor: s.actor,
    report: { attendance, version: version + 1, submitted_at: new Date().toISOString(), edited_at: null },
    ...(open ? { lesson_change: { actor: s.actor, changes: [change] } } : { student: { attendance, chargeable } }),
  };
  await tx`select public.submit_report(${tx.json(p)})`;
}

async function lessonStatus(tx: Tx, lessonId: string): Promise<string | undefined> {
  const [row] = await tx<{ status: string }[]>`select status from public.lessons where id = ${lessonId}`;
  return row?.status;
}

test.describe('submit_report re-derives the lesson outcome (R-REP-03, R-PAY-02)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('group lesson: excused first, then a sibling on time → completed (the teacher is paid)', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx, 2);
      await submit(tx, { s, index: 0, attendance: 'excused', version: 0 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('excused');
      await submit(tx, { s, index: 1, attendance: 'on_time', version: 0 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('completed');
      const audits = await tx<{ after: { via: string; status: string } }[]>`
        select after from public.audit_log where entity = 'lessons' and entity_id = ${s.lessonId}
          and action = 'status_change' and after ->> 'via' = 'report'`;
      expect(audits.map((a) => a.after.status)).toContain('completed');
    });
  });

  test('1:1 report corrected absent → on time: completed and numbered; back to absent: no_show', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx, 1);
      await submit(tx, { s, index: 0, attendance: 'absent', version: 0 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('no_show');
      await submit(tx, { s, index: 0, attendance: 'on_time', version: 1 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('completed');
      const seq = await tx`select 1 from public.v_lesson_sequence where lesson_id = ${s.lessonId}`;
      expect(seq).toHaveLength(1);
      await submit(tx, { s, index: 0, attendance: 'absent', version: 2 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('no_show');
    });
  });

  test('group lesson: one late, one absent → late; then the absent one on time → completed', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx, 2);
      await submit(tx, { s, index: 0, attendance: 'late', version: 0 });
      await submit(tx, { s, index: 1, attendance: 'absent', version: 0 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('late');
      await submit(tx, { s, index: 1, attendance: 'on_time', version: 1 });
      expect(await lessonStatus(tx, s.lessonId)).toBe('completed');
    });
  });
});
