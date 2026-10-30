import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { openFilters, showResults } from '../../support/core/filters';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily, setAvailability, withSql } from '../../support/schedule';

// All-teachers calendar (R-SCH-01, research-calendar item 15): rows come from the teachers table,
// not from lessons, so a teacher with nothing booked still shows. «أبرار» works Sunday 16:00–20:00
// Riyadh next week, teaches one trial at 17:00 and is off all Monday; a second, profile-less male
// Arabic teacher has nothing. Book-from-gap lands on the wizard with «أبرار» preselected.

const STUDENT = `تجربة الجدول ${Date.now() % 100_000}`; // unique: the student search must find exactly this one
const OTHER = `معلم الجدول ${Date.now() % 100_000}`;

interface Seed {
  abrarId: string;
  otherId: string;
  studentId: string;
  sunday: string;
}

async function seed(): Promise<Seed> {
  const abrarId = await resetAbrar();
  const sunday = addDays(nextWeekSaturday(), 1);
  await setAvailability(abrarId, [[0, '16:00', '20:00']]);
  const family = await seedFamily('أم تجربة', [STUDENT]);
  const studentId = family.studentIds[0] ?? '';
  const otherId = await withSql(async (sql) => {
    await sql`update public.teachers set max_students = 10 where id = ${abrarId}`;
    await sql`update public.students set teacher_id = ${abrarId}, status = 'trial' where id = ${studentId}`;
    await sql`insert into public.teacher_time_off (teacher_id, starts_at, ends_at, reason)
      values (${abrarId}, ${riyadh(addDays(sunday, 1), '00:00')}, ${riyadh(addDays(sunday, 2), '00:00')}, 'سفر')`;
    const [rule] = await sql<{ id: string }[]>`
      insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday, starts_on, package)
      values (${abrarId}, 45, '17:00', 'Asia/Riyadh', '{0}', ${sunday}, 'trial') returning id`;
    const startsAt = riyadh(sunday, '17:00');
    const [lesson] = await sql<{ id: string }[]>`
      insert into public.lessons (teacher_id, rule_id, starts_at, ends_at, meeting_link)
      values (${abrarId}, ${rule?.id ?? null}, ${startsAt}, ${new Date(startsAt.getTime() + 45 * 60_000)},
        'https://meet.jit.si/ayat-e2e-abrar') returning id`;
    await sql`insert into public.lesson_students (lesson_id, student_id) values (${lesson?.id ?? ''}, ${studentId})`;
    const [other] = await sql<{ id: string }[]>`
      insert into public.teachers (display_name_ar, gender, programs, tz)
      values (${OTHER}, 'male', '{arabic}', 'Asia/Riyadh') returning id`;
    return other?.id ?? '';
  });
  return { abrarId, otherId, studentId, sunday };
}

async function cleanUp(s: Seed): Promise<void> {
  await resetAbrar();
  await withSql(async (sql) => {
    await sql`update public.teachers set max_students = null where id = ${s.abrarId}`;
    await sql`update public.students set teacher_id = null where id = ${s.studentId}`;
    await sql`delete from public.teachers where id = ${s.otherId}`;
  });
}

const row = (page: Page, name: string) => page.getByRole('region', { name, exact: true });

test.describe('all-teachers calendar (R-SCH-01)', () => {
  test('day view: every teacher, load, trial, time off, free gaps, filters, today, book from a gap', async ({ asRole }) => {
    const s = await seed();
    try {
      const page = await asRole('admin');
      await page.goto(`/admin/schedule?view=day&day=${s.sunday}`);

      // Both rows; the empty teacher proves rows come from teachers, not lessons.
      const abrar = row(page, 'أبرار');
      await expect(abrar).toBeVisible();
      await expect(row(page, OTHER)).toContainText(ar.schedule.noLessons);
      // Other journeys may leave students on «أبرار»: the count is theirs plus ours.
      await expect(abrar).toContainText(new RegExp(ar.dashboard.ofMax.replace('{n}', '\\d+').replace('{max}', '10')));
      const chip = abrar.getByRole('button', { name: new RegExp(`17:00.*${STUDENT}`) });
      await expect(chip).toContainText(ar.schedule.trialTag);
      const gap = abrar.getByRole('link', { name: /متاح 16:00 – 17:00/ });
      await expect(gap).toBeVisible();
      await expect(abrar.getByRole('link', { name: /متاح 17:45 – 20:00/ })).toBeVisible();

      // Monday: the whole day off is one note with the reason.
      await page.getByRole('button', { name: ar.schedule.nextDay }).click();
      await expect(row(page, 'أبرار')).toContainText(`${ar.schedule.dayOff} · سفر`);

      // Gender filter hides the male teacher; «اليوم» goes back to today.
      const panel = await openFilters(page); // the shared «تصفية» panel
      await panel.getByLabel(ar.teachers.gender).selectOption('female');
      await showResults(panel);
      await expect(row(page, OTHER)).toHaveCount(0);
      await page.getByRole('button', { name: ar.schedule.today, exact: true }).click();
      await expect(page).not.toHaveURL(/day=/);
      await expect(page.getByRole('button', { name: ar.schedule.today, exact: true })).toBeDisabled();

      // A free gap opens the booking wizard with that teacher and start.
      await page.goto(`/admin/schedule?view=day&day=${s.sunday}`);
      await row(page, 'أبرار').getByRole('link', { name: /متاح 16:00 – 17:00/ }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/book\\?.*teacherId=${s.abrarId}`));
      // The gap stays in sight (chip) while the admin searches and picks the student: the
      // teacher and start survive the reopen for that student (not dropped by the navigation).
      await expect(page.getByText(ar.booking.gapChip.split(' · ')[0] ?? '')).toBeVisible();
      await page.getByRole('search').getByRole('textbox').fill(STUDENT);
      await page.getByRole('button', { name: new RegExp(STUDENT) }).click();
      await expect(page).toHaveURL(new RegExp(`studentId=${s.studentId}`));
      await expect(page).toHaveURL(new RegExp(`teacherId=${s.abrarId}`));
      await expect(page.getByText(ar.booking.gapChip.split(' · ')[0] ?? '')).toBeVisible();
      await page.getByRole('button', { name: ar.booking.next }).click();
      await expect(page.getByRole('radio', { name: /أبرار/ })).toBeChecked();
    } finally {
      await cleanUp(s);
    }
  });

  test('week view keeps ?teacher= links and lists the teacher with an empty week', async ({ asRole }) => {
    const s = await seed();
    try {
      const page = await asRole('admin');
      await page.goto(`/admin/schedule?week=${addDays(s.sunday, -1)}&teacher=${s.otherId}`);
      const grid = page.getByRole('table', { name: ar.schedule.grid }).or(page.getByRole('group', { name: ar.schedule.grid })); // table, or the day list on a phone
      // The table has one row header per teacher; on a phone the day list shows names only above lessons.
      if (test.info().project.name === 'desktop') {
        await expect(grid.getByRole('rowheader')).toHaveCount(1);
        await expect(grid.getByRole('rowheader')).toContainText(OTHER);
      } else {
        await expect(grid.getByText(ar.schedule.noLessons)).toHaveCount(7);
      }
      await page.goto(`/admin/schedule?week=${addDays(s.sunday, -1)}&teacher=${s.abrarId}`);
      await expect(grid.getByRole('button', { name: new RegExp(`17:00.*${STUDENT}`) })).toContainText(ar.schedule.trialTag);
    } finally {
      await cleanUp(s);
    }
  });
});
