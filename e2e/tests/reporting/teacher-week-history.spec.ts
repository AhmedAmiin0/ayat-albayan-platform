import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { startedToday } from '../../support/finance/money';
import { addDays, resetAbrar, riyadh, seedFamily, seedLesson, withSql } from '../../support/core/schedule';
import { apiSubmit } from '../../support/reporting/teacher-extra';

// Teacher dashboard beyond journey 2 (R-TCH-03, R-REP-05, R-SCH-03, docs/46 C1/C4): the
// teacher's join link, the week tab across days on the teacher's (Cairo) clock, «سأحضر» on a
// coming lesson, «تقارير لسه ما اتكتبتش» → the report, and the board «طلابي» → the drawer's
// report history with its grade chart.

const DAY = 86_400_000;
const LINK = 'https://meet.jit.si/ayat-e2e-teacher-link';

/** A lesson's local date and clock on the teacher's Cairo clock. */
function cairo(at: Date): { day: string; clock: string } {
  const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Africa/Cairo' });
  return { day: at.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' }), clock: clock.format(at) };
}
const weekdayName = (day: string) => ar.enums.weekday[String(new Date(`${day}T00:00:00Z`).getUTCDay()) as keyof typeof ar.enums.weekday];

async function student(tag: string, name: string): Promise<{ id: string; name: string }> {
  const family = await seedFamily(`أم ${name}`, [`${name} ${tag}`]);
  return { id: family.studentIds[0] ?? '', name: `${name} ${tag}` };
}

async function seedAll(teacherId: string, tag: string) {
  const riyadhToday = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const week = await student(tag, 'ريماس');
  const waiting = await student(tag, 'ضحى');
  const history = await student(tag, 'جنى');
  const slot = (days: number) => riyadh(addDays(riyadhToday, days), '12:00');
  const lesson = (studentId: string, startsAt: Date) => seedLesson({ teacherId, studentId, startsAt, minutes: 45 });
  const days = [startedToday(), slot(2), slot(4)];
  const weekLessons = await Promise.all(days.map((d) => lesson(week.id, d)));
  const missing = await lesson(waiting.id, new Date(Date.now() - 2 * DAY));
  const past = [await lesson(history.id, new Date(Date.now() - 3 * DAY)), await lesson(history.id, new Date(Date.now() - 5 * DAY))];
  await withSql((sql) => sql`update public.students set teacher_id = ${teacherId} where id = ${history.id}`);
  return { week, waiting, history, days, weekLessons, missing, past };
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name }).click();

test.describe('teacher dashboard — week, pending reports, history (R-TCH-03, R-REP-05)', () => {
  test('join link, the week by day, «سأحضر», a missing report, and the student history chart', async ({ asRole }) => {
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

      // The teacher's own link; today's card (already started) has no family-style «تأكيد
      // الحلقة» (docs/46 D1).
      await teacher.reload();
      await expect(teacher.getByRole('region', { name: ar.teacherDash.joinLink }).getByRole('link', { name: ar.teacherDash.join })).toHaveAttribute('href', LINK);
      await tab(teacher, ar.teacherDash.today);
      const card = teacher.getByRole('article', { name: new RegExp(s.week.name) });
      await expect(card.getByRole('button', { name: ar.lessons.event.complete })).toBeVisible();
      await expect(card.getByRole('button', { name: ar.lessons.event.confirm })).toHaveCount(0);

      // The week tab: one card on each of the three days, at the Cairo clock.
      await tab(teacher, ar.teacherDash.week);
      await expect(teacher.getByRole('article', { name: new RegExp(s.week.name) })).toHaveCount(3);
      for (const at of s.days) {
        const { day, clock } = cairo(at);
        const section = teacher.getByRole('region', { name: new RegExp(`^${weekdayName(day)} `) });
        await expect(section.getByRole('article', { name: new RegExp(`^${clock} .*${s.week.name}`) })).toHaveCount(1);
      }

      // «سأحضر» on a coming lesson (docs/46 C4): the chip, teacher_confirmed_at set, the
      // status kept.
      const ahead = cairo(s.days[1] ?? new Date());
      const coming = teacher.getByRole('article', { name: new RegExp(`^${ahead.clock} .*${s.week.name}`) }).first();
      await coming.getByRole('button', { name: ar.teacherBoard.confirm }).click();
      await expect(coming.getByText(ar.teacherBoard.confirmedChip)).toBeVisible();
      const said = await withSql((sql) => sql<{ status: string; yes: boolean }[]>`select status, teacher_confirmed_at is not null as yes from public.lessons where id = ${s.weekLessons[1] ?? ''}`);
      expect(said).toEqual([{ status: 'scheduled', yes: true }]);

      // «تقارير لم تُكتب بعد»: the past lesson without a report opens its form.
      await tab(teacher, ar.teacherDash.today);
      const pending = teacher.getByRole('region', { name: ar.reports.pending });
      await pending.getByRole('listitem').filter({ hasText: s.waiting.name }).getByRole('link', { name: ar.reports.open }).click();
      await expect(teacher).toHaveURL(new RegExp(`/teacher/report/${s.missing}$`));
      await expect(teacher.getByRole('region', { name: ar.reports.identity })).toContainText(s.waiting.name);

      // «طلابي» (the board, the home's first tab) → the student's row opens «ملف الطالب»
      // (docs/48) → «التقارير»: two reports and two points on the grade chart.
      await teacher.goto('/teacher');
      const board = teacher.getByRole('table', { name: ar.teacherBoard.tab });
      await board.getByRole('row').filter({ hasText: s.history.name }).click();
      await expect(teacher).toHaveURL(new RegExp(`/teacher/students/${s.history.id}`));
      await teacher.getByRole('tab', { name: ar.teacherBoard.reportsTab }).click();
      const panel = teacher.getByRole('tabpanel');
      await expect(panel.getByRole('region', { name: ar.reports.title }).locator('ol > li')).toHaveCount(2);
      await expect(panel.getByRole('region', { name: ar.reports.progress }).getByRole('figure').getByRole('img')).toHaveCount(2);
    } finally {
      await withSql((sql) => sql`update public.teachers set meeting_link = ${link} where id = ${teacherId}`);
    }
  });
});
