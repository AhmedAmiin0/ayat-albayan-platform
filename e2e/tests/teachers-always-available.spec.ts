import { ar, expect, test } from '../support/fixtures';
import { uploadInvoice } from '../support/finance/invoice';
import { setSetting } from '../support/messages';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily, seedLesson, withSql } from '../support/schedule';

// Owner 2026-10-12 «make all the teachers available 24/7» (settings.teachers_always_available,
// migration 320): «أبرار» has no saved availability, yet she can be picked, 03:00 Riyadh books with
// no conflict and no reason, and a start over a booked lesson is still marked busy. Global setup
// seeds the switch off for the grid-based journeys; this spec turns it on and back off.

const KEY = 'teachers_always_available';

test.describe('teachers available 24/7 (owner 2026-10-12)', () => {
  test.beforeEach(async () => {
    await setSetting(KEY, true);
  });
  test.afterEach(async () => {
    await setSetting(KEY, false);
  });

  test('no saved grid → pickable; 03:00 books with no conflict; 16:00 over a lesson stays busy', async ({ asRole }) => {
    const teacherId = await resetAbrar(); // no teacher_availability rows at all
    const sunday = addDays(nextWeekSaturday(), 1);
    const stamp = String(Date.now()).slice(-4);
    const other = await seedFamily(`أم سلمى${stamp}`, [`سلمى${stamp}`]);
    const mine = await seedFamily(`أم هند${stamp}`, [`هند${stamp}`]);
    const [otherId = ''] = other.studentIds;
    const [studentId = ''] = mine.studentIds;
    await seedLesson({ teacherId, studentId: otherId, startsAt: riyadh(sunday, '16:00'), minutes: 45 });

    const admin = await asRole('admin');
    await admin.goto(`/admin/book?studentId=${studentId}`);
    const next = () => admin.getByRole('button', { name: ar.booking.next }).click();
    await next();
    const abrar = admin.getByRole('radio', { name: /أبرار/ });
    await expect(abrar).toBeEnabled();
    await abrar.check();
    await next();
    await next(); // package 8, 45 min
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    const day = step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) });
    await expect(day.getByRole('button', { name: /16:00/ })).toContainText(ar.booking.slotBusy);
    await day.getByRole('button', { name: /^03:00/ }).click();
    await next();
    await uploadInvoice(admin);
    await admin.getByRole('button', { name: ar.booking.submit }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();
    await expect(admin.getByText(ar.booking.conflictTitle)).toHaveCount(0);

    // Every lesson of the series at 03:00 Riyadh, none needing an override reason.
    const rows = await withSql((sql) => sql<{ starts_at: Date; override_reason: string | null }[]>`
      select l.starts_at, l.override_reason from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id
      where ls.student_id = ${studentId} order by l.starts_at`);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]?.starts_at.toISOString()).toBe(riyadh(sunday, '03:00').toISOString());
    expect(rows.map((l) => l.override_reason)).toEqual(rows.map(() => null));
  });
});
