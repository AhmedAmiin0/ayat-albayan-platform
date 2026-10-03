import { ar, expect, test } from '../support/fixtures';
import {
  addDays,
  lessonsOf,
  nextWeekSaturday,
  queuedFor,
  resetAbrar,
  riyadh,
  seedFamily,
  seedLesson,
  setAvailability,
} from '../support/schedule';

// Journey 4 (docs/03 §5): admin reschedules one occurrence → conflict detected → chooses another
// slot → guardian notified (a queued booking confirmation). R-SCH-07, R-SCH-04, R-SCH-01.

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

test.describe('journey 4 — reschedule into a busy slot (R-SCH-07, R-SCH-04)', () => {
  test('busy slot → conflict in Arabic → another free slot → moved, guardian confirmation queued', async ({
    asRole,
  }) => {
    // «أبرار» works 14:00–20:00 Riyadh every day: 45-minute starts at 14:00, 14:45, 15:30 …
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, EVERY_DAY.map((d) => [d, '14:00', '20:00']));
    const week = nextWeekSaturday();
    const sunday = addDays(week, 1);
    const monday = addDays(week, 2);
    const reem = await seedFamily('أم ريم', ['ريم']);
    const leen = await seedFamily('أم لين', ['لين']);
    const [reemId = '', leenId = ''] = [...reem.studentIds, ...leen.studentIds];
    await seedLesson({ teacherId, studentId: reemId, startsAt: riyadh(sunday, '14:00'), minutes: 45 });
    await seedLesson({ teacherId, studentId: leenId, startsAt: riyadh(monday, '14:00'), minutes: 45 });

    const page = await asRole('admin');
    await page.goto(`/admin/schedule?week=${week}&teacher=${teacherId}`);
    const grid = page.getByRole('table', { name: ar.schedule.grid }).or(page.getByRole('group', { name: ar.schedule.grid })); // table, or the day list on a phone
    await grid.getByRole('button', { name: /ريم/ }).click();
    const drawer = page.getByRole('dialog', { name: 'ريم' });
    await expect(drawer).toContainText(ar.schedule.riyadhTime);
    await drawer.getByRole('button', { name: ar.lessons.event.reschedule }).click();

    // Monday 14:00 is Leen's lesson: still pickable, refused with the reason in Arabic.
    const mondaySlots = drawer.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['1']} `) });
    await mondaySlots.getByRole('button', { name: /14:00/ }).click();
    await drawer.getByRole('button', { name: ar.lessons.rescheduleSubmit }).click();
    await expect(drawer.getByText(ar.booking.conflictTitle)).toBeVisible();
    await expect(drawer.getByText(/المعلم\/ة مشغول\/ة بحلقة تانية في الميعاد ده/)).toBeVisible();

    await drawer.getByRole('button', { name: ar.booking.changeSlot }).click();
    await mondaySlots.getByRole('button', { name: /15:30/ }).click();
    await drawer.getByRole('button', { name: ar.lessons.rescheduleSubmit }).click();
    await expect(page.getByRole('status')).toHaveText(ar.lessons.rescheduled);

    // The week shows Reem on Monday 15:30; the moved Sunday row is closed (hidden by default).
    await expect(grid.getByRole('button', { name: /15:30.*ريم/ })).toBeVisible();
    await expect(grid.getByRole('button', { name: /14:00.*ريم/ })).toHaveCount(0);
    const rows = await lessonsOf(reemId);
    expect(rows.map((l) => [l.status, l.starts_at.toISOString()])).toEqual([
      ['rescheduled', riyadh(sunday, '14:00').toISOString()],
      ['scheduled', riyadh(monday, '15:30').toISOString()],
    ]);

    // Guardian notified: one booking confirmation (jitsi link → booking_confirmation) queued.
    await expect.poll(() => queuedFor(reem.guardianId)).toEqual([
      expect.objectContaining({ template_key: 'booking_confirmation', status: 'queued' }),
    ]);
  });
});
