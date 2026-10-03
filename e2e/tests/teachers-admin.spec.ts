import type { Page } from '@playwright/test';
import { dropTeacher, insertTeacher } from '../support/admin-extra';
import { ar, expect, test } from '../support/fixtures';
import { addDays, nextWeekSaturday, seedFamily, withSql } from '../support/schedule';

// R-TCH-01/02: create a teacher, rates, the admin availability grid, time off, and time off
// blocking the booking wizard's slots. Not asserted: a students count (TeacherFacts has none).

const STAMP = Date.now() % 1_000_000;
const NAME = `أستاذة الإدارة ${STAMP}`;
const SUNDAY = ar.enums.weekday['0'];

async function pickTeacherInWizard(page: Page, studentId: string): Promise<void> {
  await page.goto(`/admin/book?studentId=${studentId}`);
  await page.getByRole('button', { name: ar.booking.next }).click();
  await page.getByRole('radio', { name: new RegExp(NAME) }).check();
  await page.getByRole('button', { name: ar.booking.next }).click();
  await page.getByRole('button', { name: ar.booking.next }).click();
}

test.describe('teachers admin (R-TCH-01/02)', () => {
  test('create a teacher: names, programs, local phone stored E.164, link, rates, max students', async ({ asRole }) => {
    const digits = String(Date.now()).slice(-8);
    const page = await asRole('admin');
    await page.goto('/admin/teachers');
    await page.getByRole('button', { name: ar.teachers.add }).click();
    const dialog = page.getByRole('dialog', { name: ar.teachers.add });
    const field = (label: string) => dialog.getByLabel(label, { exact: true });
    await field(ar.teachers.displayNameAr).fill(NAME);
    await field(ar.teachers.displayNameEn).fill(`Ustadha ${STAMP}`);
    await field(ar.teachers.gender).selectOption('male');
    await dialog.getByRole('checkbox', { name: ar.enums.program.arabic }).check();
    await field(ar.teachers.phone).fill(`05${digits}`);
    await expect(dialog).toContainText(`+9665${digits}`);
    await field(ar.teachers.meetingLink).fill(`https://meet.jit.si/ab-teacher-${STAMP}`);
    await field(ar.teachers.tz).selectOption('Asia/Riyadh');
    await field(ar.teachers.maxStudents).fill('7');
    const rateInputs: Record<string, string> = {
      [ar.teachers.rate30]: '40', [ar.teachers.rate45]: '55', [ar.teachers.rate60]: '70', [ar.teachers.rate90]: '100',
    };
    for (const [label, rate] of Object.entries(rateInputs)) await field(label).fill(rate);
    await dialog.getByRole('button', { name: ar.common.save }).click();
    await expect(dialog).toBeHidden();

    try {
      await expect(page.getByRole('button', { name: NAME, exact: true })).toBeVisible();
      const [row] = await withSql((sql) => sql<{ id: string; phone_e164: string; programs: string[]; gender: string; max_students: number; rate_30: number; rate_45: number; rate_60: number; rate_90: number }[]>`
        select id, phone_e164, programs, gender, max_students, rate_30, rate_45, rate_60, rate_90
        from public.teachers where display_name_ar = ${NAME}`);
      expect(row).toMatchObject({ phone_e164: `+9665${digits}`, gender: 'male', max_students: 7, rate_30: 40, rate_45: 55, rate_60: 70, rate_90: 100 });
      expect(row?.programs.sort()).toEqual(['arabic', 'quran']);

      await page.getByRole('button', { name: NAME, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: NAME })).toBeVisible();
      const rates = page.locator('section').filter({ has: page.getByRole('heading', { name: ar.teachers.rates }) });
      await expect(rates.getByRole('row', { name: new RegExp(`${ar.teachers.rate45}.*55`) })).toBeVisible();
      await expect(rates.getByRole('row')).toHaveCount(4);
      await page.getByRole('tab', { name: ar.teachers.tabData }).click();
      const facts = page.getByRole('tabpanel', { name: ar.teachers.tabData });
      await expect(facts.getByText(`+9665${digits}`)).toBeVisible();
      await expect(facts.getByText(`https://meet.jit.si/ab-teacher-${STAMP}`)).toBeVisible();
      await expect(facts).toContainText(ar.teachers.genderLabel.male);
    } finally {
      await withSql((sql) => sql`delete from public.teachers where display_name_ar = ${NAME}`);
    }
  });

  test('availability grid saves Sunday 16:00–18:00; time off blocks next Sunday in the wizard, not the week after', async ({ asRole }) => {
    const teacherId = await insertTeacher({ name: NAME });
    const family = await seedFamily('أم الإدارة', [`طالب الإدارة ${STAMP}`]);
    const sunday = addDays(nextWeekSaturday(), 1);
    try {
      const page = await asRole('admin');
      await page.goto(`/admin/teachers/${teacherId}`);
      await page.getByLabel(ar.availability.tz).selectOption('Asia/Riyadh');
      await page.getByRole('button', { name: `${ar.availability.addSlot} ${SUNDAY}`, exact: true }).click();
      await page.getByLabel(`${SUNDAY} ${ar.availability.from}`).selectOption('16:00');
      await page.getByLabel(`${SUNDAY} ${ar.availability.to}`).selectOption('18:00');
      await page.getByRole('button', { name: ar.availability.save }).click();
      await expect(page.getByRole('status')).toHaveText(ar.availability.saved);
      const slots = await withSql((sql) => sql<{ weekday: number; start_time: string; end_time: string; tz: string }[]>`
        select weekday, start_time::text, end_time::text, tz from public.teacher_availability where teacher_id = ${teacherId}`);
      expect(slots).toEqual([{ weekday: 0, start_time: '16:00:00', end_time: '18:00:00', tz: 'Asia/Riyadh' }]);

      await page.getByRole('button', { name: ar.availability.timeOffAdd }).click();
      const dialog = page.getByRole('dialog', { name: ar.availability.timeOffAdd });
      await dialog.getByLabel(ar.availability.startsAt, { exact: true }).fill(sunday);
      await dialog.getByLabel(ar.availability.endsAt, { exact: true }).fill(sunday);
      await dialog.getByLabel(ar.availability.reason, { exact: true }).fill('سفر الإدارة');
      await dialog.getByRole('button', { name: ar.availability.timeOffAdd }).click();
      await expect(page.getByText(`${ar.availability.reason}: سفر الإدارة`)).toBeVisible();
      const [off] = await withSql((sql) => sql<{ starts_at: Date; ends_at: Date }[]>`
        select starts_at, ends_at from public.teacher_time_off where teacher_id = ${teacherId}`);
      expect(off?.starts_at.toISOString()).toBe(`${addDays(sunday, -1)}T21:00:00.000Z`);
      expect(off?.ends_at.toISOString()).toBe(`${sunday}T21:00:00.000Z`);

      await pickTeacherInWizard(page, family.studentIds[0] ?? '');
      const step = page.getByRole('region', { name: ar.booking.steps.slot });
      await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
      const day = () => step.getByRole('region', { name: new RegExp(`^${SUNDAY} `) });
      await expect(day().getByRole('button')).toHaveCount(2);
      await expect(day().getByRole('button').filter({ hasNotText: ar.booking.slotBusy })).toHaveCount(0);
      await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
      const free = day().getByRole('button').filter({ hasNotText: ar.booking.slotBusy });
      await expect(free.first()).toContainText('16:00');
      await expect(free).toHaveCount(2);
    } finally {
      await dropTeacher(teacherId);
    }
  });
});
