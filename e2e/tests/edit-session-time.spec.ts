import { ar, expect, test } from '../support/fixtures';
import { addDays, nextWeekSaturday, queuedFor, resetAbrar, riyadh, seedFamily, seedLesson, setAvailability } from '../support/schedule';
import { auditOf, autoMessages, cairo, fillForm, L, lessonRows, openForm, save } from './edit-session-time.helpers';

// «عدّل الوقت» (R-SCH-11): edit ONE lesson in place (same id, report, payments), not «غيّر الميعاد».
// Needs the API's PATCH /lessons/:id/time (migration 174), so it only passes once that is merged.
// Held lessons (correction, payout line, payout lock): edit-session-time.held.spec.ts.

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6].map((d): [number, string, string] => [d, '14:00', '20:00']);

test.describe('«عدّل الوقت» — scheduled lessons (R-SCH-11)', () => {
  test('moves the same lesson, audits it and queues the confirmation even with auto messages off', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, EVERY_DAY);
    const week = nextWeekSaturday();
    const family = await seedFamily('أم سدرة', ['سدرة']);
    const from = riyadh(addDays(week, 1), '14:00');
    const lessonId = await seedLesson({ teacherId, studentId: family.studentIds[0] ?? '', startsAt: from, minutes: 45 });
    const target = riyadh(addDays(week, 2), '15:30');
    await autoMessages(false);
    try {
      const page = await asRole('admin');
      const drawer = await openForm(page, { date: addDays(week, 1), teacherId, name: 'سدرة' });
      await fillForm(drawer, { date: cairo(target).date, time: cairo(target).time, minutes: '60' });
      await expect(drawer.getByLabel(L.notify)).toBeChecked();
      await save(drawer);
      await expect(page.getByRole('status')).toHaveText(L.savedNotified);

      // The same row moved and grew: no «rescheduled» twin.
      expect((await lessonRows(teacherId)).map((r) => [r.id, r.status, r.starts_at, r.ends_at])).toEqual([
        [lessonId, 'scheduled', target, new Date(target.getTime() + 60 * 60_000)],
      ]);
      const [audit] = await auditOf(lessonId);
      expect(new Date(audit?.before.starts_at ?? '')).toEqual(from);
      expect(audit?.after).toMatchObject({ mode: 'move', notified: 1 });
      await expect.poll(() => queuedFor(family.guardianId)).toEqual([
        expect.objectContaining({ template_key: 'booking_confirmation', status: 'queued', lesson_id: lessonId }),
      ]);
    } finally {
      await autoMessages(true);
    }
  });

  test('a clash is refused in Arabic; saving over it needs a reason', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, EVERY_DAY);
    const week = nextWeekSaturday();
    const [reem, leen] = [await seedFamily('أم ريم', ['ريم']), await seedFamily('أم لين', ['لين'])];
    const from = riyadh(addDays(week, 1), '14:00');
    const id = await seedLesson({ teacherId, studentId: reem.studentIds[0] ?? '', startsAt: from, minutes: 45 });
    const busy = riyadh(addDays(week, 2), '15:30');
    await seedLesson({ teacherId, studentId: leen.studentIds[0] ?? '', startsAt: busy, minutes: 45 });

    const page = await asRole('admin');
    const drawer = await openForm(page, { date: addDays(week, 1), teacherId, name: 'ريم' });
    await fillForm(drawer, { date: cairo(busy).date, time: cairo(busy).time });
    await save(drawer);
    await expect(drawer.getByText(ar.booking.conflictTitle)).toBeVisible();
    await expect(drawer.getByText(/المعلم\/ة مشغول\/ة بحلقة تانية في الميعاد ده/)).toBeVisible();
    expect((await lessonRows(teacherId)).find((r) => r.id === id)?.starts_at).toEqual(from);

    await drawer.getByLabel(ar.booking.overrideReason).fill('طلب ولي الأمر');
    await drawer.getByRole('button', { name: ar.booking.override }).click();
    await expect(page.getByRole('status')).toHaveText(L.savedNotified);
    expect((await lessonRows(teacherId)).find((r) => r.id === id)).toMatchObject({ starts_at: busy, override_reason: 'طلب ولي الأمر' });
  });
});
