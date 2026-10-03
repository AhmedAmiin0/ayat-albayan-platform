import type { Page } from '@playwright/test';
import { dropTeacher, insertLesson, insertTeacher, setStudentTz } from '../support/admin-extra';
import { ar, expect, test } from '../support/fixtures';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily } from '../support/schedule';

// R-SCH-01/03, all-teachers week (schedule-overview.spec.ts has the day board, the gender filter
// and book-from-gap): no ?teacher=, teacher / program / status / closed filters, the lesson drawer
// and week navigation. Chips are found by their unique student name (the chip prints no teacher;
// the row header, or the agenda heading on a phone, does).

const STAMP = Date.now() % 1_000_000;
const WEEK = nextWeekSaturday();
const SUNDAY = addDays(WEEK, 1);
const LINK = `https://meet.jit.si/ab-all-${STAMP}`;
const NAMES = { abrar: 'أبرار', quran: `معلمة القرآن ${STAMP}`, arabic: `معلمة العربي ${STAMP}` };
const STUDENTS = { abrar: `طالب أبرار ${STAMP}`, quran: `طالب القرآن ${STAMP}`, arabic: `طالب العربي ${STAMP}`, closed: `طالب الملغية ${STAMP}` };
const ids = { abrar: '', quran: '', arabic: '' };

const chip = (page: Page, student: string) => page.getByRole('button', { name: new RegExp(student) });
const grid = (page: Page) => page.getByRole('table', { name: ar.schedule.grid }).or(page.getByRole('group', { name: ar.schedule.grid }));
const open = (page: Page, query = '') => page.goto(`/admin/schedule?week=${WEEK}${query}`);

async function expectOnly(page: Page, shown: string[]): Promise<void> {
  for (const s of Object.values(STUDENTS)) {
    if (shown.includes(s)) await expect(chip(page, s)).toBeVisible();
    else await expect(chip(page, s)).toHaveCount(0);
  }
}

test.describe('all-teachers week schedule (R-SCH-01/03)', () => {
  test.beforeAll(async () => {
    ids.abrar = await resetAbrar();
    ids.quran = await insertTeacher({ name: NAMES.quran });
    ids.arabic = await insertTeacher({ name: NAMES.arabic, programs: ['arabic'] });
    const lessons: [keyof typeof ids, string, string, string, string][] = [
      ['abrar', STUDENTS.abrar, 'confirmed', '17:00', addDays(SUNDAY, 0)],
      ['quran', STUDENTS.quran, 'scheduled', '18:00', addDays(SUNDAY, 0)],
      ['arabic', STUDENTS.arabic, 'confirmed', '19:00', addDays(SUNDAY, 0)],
      ['arabic', STUDENTS.closed, 'cancelled_by_admin', '19:00', addDays(SUNDAY, 1)],
    ];
    for (const [who, student, status, time, day] of lessons) {
      const family = await seedFamily(`أم ${student}`, [student]);
      const studentId = family.studentIds[0] ?? '';
      if (who === 'abrar') await setStudentTz(studentId, 'Europe/London');
      await insertLesson({ teacherId: ids[who], studentId, startsAt: riyadh(day, time), status, link: who === 'abrar' ? LINK : `${LINK}-${who}` });
    }
  });

  test.afterAll(async () => {
    await resetAbrar();
    await dropTeacher(ids.quran);
    await dropTeacher(ids.arabic);
  });

  test('no teacher in the URL: every teacher\'s open lessons, closed ones hidden; the toggle reveals them', async ({ asRole }) => {
    const page = await asRole('admin');
    await open(page);
    await expectOnly(page, [STUDENTS.abrar, STUDENTS.quran, STUDENTS.arabic]);
    for (const name of Object.values(NAMES)) await expect(grid(page).getByText(name, { exact: true })).toBeVisible();
    await page.getByLabel(ar.schedule.showClosed).check();
    await expect(page).toHaveURL(/closed=true/);
    await expectOnly(page, Object.values(STUDENTS));
  });

  test('teacher (URL and picker), program and status filters narrow the week', async ({ asRole }) => {
    const page = await asRole('admin');
    await open(page, `&teacher=${ids.quran}`);
    await expectOnly(page, [STUDENTS.quran]);
    await expect(grid(page).getByText(NAMES.arabic, { exact: true })).toHaveCount(0);

    await open(page);
    await page.locator('summary').filter({ hasText: ar.schedule.teacherFilter }).click();
    await page.getByRole('checkbox', { name: NAMES.arabic }).check();
    await expect(page).toHaveURL(/teachers=/);
    await expectOnly(page, [STUDENTS.arabic]);

    await open(page);
    await page.getByLabel(ar.schedule.programFilter, { exact: true }).selectOption('arabic');
    await expect(page).toHaveURL(/program=arabic/);
    await expectOnly(page, [STUDENTS.arabic]);

    await open(page);
    await page.getByLabel(ar.schedule.statusFilter, { exact: true }).selectOption('confirmed');
    await expect(page).toHaveURL(/status=confirmed/);
    await expectOnly(page, [STUDENTS.abrar, STUDENTS.arabic]);
  });

  test('the drawer shows teacher, student, Riyadh time, the student\'s local time and the meeting link', async ({ asRole }) => {
    const page = await asRole('admin');
    await open(page);
    await chip(page, STUDENTS.abrar).click();
    const drawer = page.getByRole('dialog', { name: STUDENTS.abrar });
    await expect(drawer).toContainText(NAMES.abrar);
    await expect(drawer).toContainText(/AB-\d{4,}/);
    await expect(drawer).toContainText(`17:00 ${ar.schedule.riyadhTime}`);
    const london = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(riyadh(SUNDAY, '17:00'));
    const local = ar.schedule.inCity.replace('{time}', london).replace('{city}', ar.tz['Europe/London']);
    await expect(drawer).toContainText(ar.schedule.studentTime.replace('{time}', local));
    await expect(drawer.getByRole('link', { name: new RegExp(ar.lessons.join) })).toHaveAttribute('href', LINK);
  });

  test('next and previous week update ?week= and bring the lessons back', async ({ asRole }) => {
    const page = await asRole('admin');
    await open(page);
    await page.getByRole('button', { name: ar.schedule.prevWeek }).click();
    await expect(page).not.toHaveURL(/week=/); // this week is the default
    await expect(chip(page, STUDENTS.abrar)).toHaveCount(0);
    await page.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await expect(page).toHaveURL(new RegExp(`week=${WEEK}`));
    await expect(chip(page, STUDENTS.abrar)).toBeVisible();
    await page.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await expect(page).toHaveURL(new RegExp(`week=${addDays(WEEK, 7)}`));
    await expect(chip(page, STUDENTS.abrar)).toHaveCount(0);
  });
});
