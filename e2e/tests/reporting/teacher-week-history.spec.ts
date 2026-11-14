import { ar, expect, test } from '../../support/core/fixtures';
import { startedToday } from '../../support/finance/money';
import { addDays, resetAbrar, riyadh, seedFamily, seedLesson, withSql } from '../../support/core/schedule';
import { apiSubmit } from '../../support/reporting/teacher-extra';
import { openMyLesson } from '../../support/teaching/my-calendar';

// Teacher pages beyond journey 2 (R-TCH-03, R-REP-05, R-SCH-03, docs/46 C1/C4): the hero's join
// link on «اليوم» (today's lessons only, owner 2026-11-14), «سأحضر» on a coming lesson in
// «جدولي», «تقارير لم تُكتب بعد» in the student file → the report, and «الطلاب» → the file.

const DAY = 86_400_000;
const LINK = 'https://meet.jit.si/ayat-e2e-teacher-link';
/** seedLesson's own link on every lesson (support/core/schedule.ts): the hero leads to it. */
const OWN_LINK = 'https://meet.jit.si/ayat-e2e-abrar';

/** A lesson's local date and clock on the teacher's Cairo clock. */
function cairo(at: Date): { day: string; clock: string } {
  const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Cairo' });
  return { day: at.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }), clock: clock.format(at) };
}

async function student(tag: string, name: string): Promise<{ id: string; name: string }> {
  const family = await seedFamily(`أم ${name}`, [`${name} ${tag}`]);
  return { id: family.studentIds[0] ?? '', name: `${name} ${tag}` };
}

async function seedAll(teacherId: string, tag: string) {
  const riyadhToday = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const week = await student(tag, 'ريماس');
  const waiting = await student(tag, 'ضحى');
  const history = await student(tag, 'جنى');
  const coming = await student(tag, 'لين');
  const slot = (days: number) => riyadh(addDays(riyadhToday, days), '12:00');
  const lesson = (studentId: string, startsAt: Date) => seedLesson({ teacherId, studentId, startsAt, minutes: 45 });
  const days = [startedToday(), slot(2)];
  const weekLessons = [
    await lesson(week.id, days[0] ?? new Date()),
    await lesson(coming.id, slot(2)),
  ];
  const missing = await lesson(waiting.id, new Date(Date.now() - 2 * DAY));
  const past = [await lesson(history.id, new Date(Date.now() - 3 * DAY)), await lesson(history.id, new Date(Date.now() - 5 * DAY))];
  await withSql((sql) => sql`update public.students set teacher_id = ${teacherId} where id in ${sql([history.id, waiting.id])}`);
  return { week, waiting, history, coming, days, weekLessons, missing, past };
}

test.describe('teacher pages — today, «جدولي», pending reports, history (R-TCH-03, R-REP-05)', () => {
  test('join link, «سأحضر» in «جدولي», a missing report, and the student file', async ({ asRole }) => {
    test.setTimeout(150_000);
    const teacherId = await resetAbrar();
    const [prev] = await withSql((sql) => sql<{ link: string | null }[]>`select meeting_link as link from public.teachers where id = ${teacherId}`);
    const link = prev?.link ?? null;
    await withSql((sql) => sql`update public.teachers set meeting_link = ${LINK} where id = ${teacherId}`);
    try {
      const tag = String(Date.now()).slice(-4);
      const s = await seedAll(teacherId, tag);
      const teacher = await asRole('teacher');
      await teacher.goto('/teacher');
      for (const lessonId of s.past) await apiSubmit(teacher, { lessonId });

      // Today's started lesson is the running hero (docs/48): its own link leads (the banner
      // hides while a hero exists); its drawer has no family-style «تأكيد الحلقة» (docs/46 D1).
      await teacher.reload();
      const hero = teacher.getByRole('region', { name: ar.today.running });
      await expect(hero.getByRole('link', { name: ar.teacherDash.join })).toHaveAttribute('href', OWN_LINK);
      await hero.getByRole('button', { name: ar.today.details }).click();
      const today = teacher.getByRole('dialog', { name: new RegExp(s.week.name) });
      await expect(today.getByRole('button', { name: ar.lessons.event.complete })).toBeVisible();
      await expect(today.getByRole('button', { name: ar.lessons.event.confirm })).toHaveCount(0);
      await today.getByRole('button', { name: ar.common.close }).click();

      // The home is today only: the coming lessons are not on it.
      await expect(teacher.getByRole('tablist')).toHaveCount(0);
      await expect(teacher.getByRole('table', { name: ar.teacherBoard.tab })).toHaveCount(0);

      // «سأحضر» on a coming lesson in «جدولي» (docs/46 C4): the chip, teacher_confirmed_at set,
      // the status kept.
      const at = s.days[1] ?? new Date();
      const drawer = await openMyLesson(teacher, { name: new RegExp(s.coming.name), at });
      const coming = drawer.getByRole('article', { name: new RegExp(`^${cairo(at).clock} .*${s.coming.name}`) });
      await coming.getByRole('button', { name: ar.teacherBoard.confirm }).click();
      await expect(coming.getByText(ar.teacherBoard.confirmedChip)).toBeVisible();
      const said = await withSql((sql) => sql<{ status: string; yes: boolean }[]>`select status, teacher_confirmed_at is not null as yes from public.lessons where id = ${s.weekLessons[1] ?? ''}`);
      expect(said).toEqual([{ status: 'scheduled', yes: true }]);

      // «تقارير لم تُكتب بعد» in her student file: the past lesson without a report opens its form.
      await teacher.goto(`/teacher/students/${s.waiting.id}`);
      const pending = teacher.getByRole('region', { name: ar.reports.pending });
      await pending.getByRole('listitem').filter({ hasText: s.waiting.name }).getByRole('link', { name: ar.reports.open }).click();
      await expect(teacher).toHaveURL(new RegExp(`/teacher/report/${s.missing}$`));
      await expect(teacher.getByRole('region', { name: ar.reports.identity })).toContainText(s.waiting.name);

      // «الطلاب» (the board, /teacher/students) → the student's row opens «ملف الطالب»
      // (docs/48): her name and «سجل الحضور» (the reports live in the lessons, docs/49).
      await teacher.goto('/teacher/students');
      const board = teacher.getByRole('table', { name: ar.teacherBoard.tab });
      await board.getByRole('row').filter({ hasText: s.history.name }).click();
      await expect(teacher).toHaveURL(new RegExp(`/teacher/students/${s.history.id}`));
      await expect(teacher.getByText(s.history.name).first()).toBeVisible();
      await expect(teacher.getByRole('region', { name: ar.teacherBoard.attendanceLog })).toBeVisible();
    } finally {
      await withSql((sql) => sql`update public.teachers set meeting_link = ${link} where id = ${teacherId}`);
    }
  });
});
