import { expect, test } from '@playwright/test';
import { as, family, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Rule 9 behind the API, in a rolled-back transaction with a teacher's JWT (teacher-rls.sql.spec
// has the messages and the draft payouts): lessons, students, reports, attachments and approved
// payouts show «أبرار» her own rows only, and a write to another teacher's lesson changes nothing.

const PHONE = { mine: '+966500190001', theirs: '+966500190002' };
const MONTH = '2031-04-01';

interface Side {
  student: string;
  lesson: string;
  report: string;
}

async function side(tx: Tx, input: { teacherId: string; phone: string }): Promise<Side> {
  const student = await family(tx, { phone: input.phone, teacherId: input.teacherId });
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at)
    values (${input.teacherId}, now() - interval '1 hour', now() - interval '15 minutes') returning id`;
  if (!l) throw new Error('lesson not written');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${l.id}, ${student})`;
  const [r] = await tx<{ id: string }[]>`insert into public.lesson_reports (lesson_id, student_id, teacher_id)
    values (${l.id}, ${student}, ${input.teacherId}) returning id`;
  if (!r) throw new Error('report not written');
  await tx`insert into public.report_attachments (report_id, storage_path, mime, size)
    values (${r.id}, ${`${r.id}/rls.png`}, 'image/png', 10)`;
  await tx`insert into public.teacher_payouts (teacher_id, month, lessons_count, amount, status, approved_at)
    values (${input.teacherId}, ${MONTH}, 1, 100, 'approved', now())
    on conflict (teacher_id, month) do update set status = 'approved', approved_at = now()`;
  return { student, lesson: l.id, report: r.id };
}

async function seed(tx: Tx) {
  const [abrar] = await tx<{ id: string }[]>`select id from public.teachers where profile_id = ${await userId(tx, USERS.teacher.email)}`;
  const [other] = await tx<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz)
    values ('معلمة العزل', 'female', '{quran}', 'Asia/Riyadh') returning id`;
  if (!abrar || !other) throw new Error('teachers missing');
  await tx`delete from public.teacher_payouts where teacher_id = ${abrar.id} and month = ${MONTH}`;
  return { abrar: abrar.id, other: other.id, mine: await side(tx, { teacherId: abrar.id, phone: PHONE.mine }), theirs: await side(tx, { teacherId: other.id, phone: PHONE.theirs }) };
}

test.describe('teacher isolation by RLS (rule 9)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a teacher selects her own lesson, student, report, attachment and payout, never another teacher’s', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const pair = (pick: (x: Side) => string) => [pick(s.mine), pick(s.theirs)];
      const [lessons, students, reports] = [pair((x) => x.lesson), pair((x) => x.student), pair((x) => x.report)];
      const read = <T extends object>(query: () => Promise<T[]>) => as(tx, teacher, query);
      type V = { v: string };
      expect(await read(() => tx<V[]>`select id::text as v from public.lessons where id in ${tx(lessons)}`)).toEqual([{ v: s.mine.lesson }]);
      expect(await read(() => tx<V[]>`select id::text as v from public.students where id in ${tx(students)}`)).toEqual([{ v: s.mine.student }]);
      expect(await read(() => tx<V[]>`select lesson_id::text as v from public.lesson_students where lesson_id in ${tx(lessons)}`)).toEqual([{ v: s.mine.lesson }]);
      expect(await read(() => tx<V[]>`select id::text as v from public.lesson_reports where id in ${tx(reports)}`)).toEqual([{ v: s.mine.report }]);
      expect(await read(() => tx<V[]>`select report_id::text as v from public.report_attachments where report_id in ${tx(reports)}`)).toEqual([{ v: s.mine.report }]);
      const pay = await as(tx, teacher, () => tx<{ teacher_id: string }[]>`select teacher_id from public.teacher_payouts where month = ${MONTH}`);
      expect(pay).toEqual([{ teacher_id: s.abrar }]);
      const admin = await userId(tx, USERS.admin.email);
      expect(await as(tx, admin, () => tx`select id from public.lessons where id in ${tx(lessons)}`)).toHaveLength(2);
    });
  });

  test('a write to another teacher’s lesson or report changes nothing', async () => {
    await rolledBack(async (tx) => {
      const s = await seed(tx);
      const teacher = await userId(tx, USERS.teacher.email);
      const attempt = (query: () => Promise<unknown>) =>
        tx.savepoint(() => as(tx, teacher, query)).catch((e: { code?: string }) => e.code);
      await attempt(() => tx`update public.lessons set status = 'confirmed' where id = ${s.theirs.lesson}`);
      await attempt(() => tx`update public.lesson_reports set notes = 'اختراق' where id = ${s.theirs.report}`);
      await attempt(() => tx`delete from public.report_attachments where report_id = ${s.theirs.report}`);
      const [lesson] = await tx<{ status: string }[]>`select status from public.lessons where id = ${s.theirs.lesson}`;
      const [report] = await tx<{ notes: string | null }[]>`select notes from public.lesson_reports where id = ${s.theirs.report}`;
      const [files] = await tx<{ n: number }[]>`select count(*)::int as n from public.report_attachments where report_id = ${s.theirs.report}`;
      expect([lesson?.status, report?.notes, files?.n]).toEqual(['scheduled', null, 1]);
    });
  });
});
