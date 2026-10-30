import { ar, expect, test } from '../../support/core/fixtures';
import { addDays, lessonsOf, nextWeekSaturday, queuedFor, resetAbrar, riyadh, seedFamily, setAvailability } from '../../support/schedule';
import { openLessonDrawer, ruleStateOf, seedWeeklyRule, weekGrid, weekOf } from '../../support/teaching/schedule-extra';

// «غيّر الموعد» with scope «هذه الحلقة وكل ما بعدها» (R-SCH-07, reschedule-rule.service.ts): the old
// rule ends the day before, its open lessons become `rescheduled`, and a new weekly rule starts at
// the picked weekday/time with ONE queued confirmation (the first new lesson's).

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;
const tag = () => String(Date.now()).slice(-4);

test.describe('reschedule a whole series (R-SCH-07)', () => {
  test('Sunday 16:00 weekly → Tuesday 17:00: the old rule ends, the new lessons fall on Tuesdays, one confirmation', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, EVERY_DAY.map((d) => [d, '14:00', '20:00']));
    const name = `هيا${tag()}`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const [studentId = ''] = family.studentIds;
    const sunday = addDays(nextWeekSaturday(), 1);
    const tuesday = addDays(sunday, 2);
    const first = riyadh(sunday, '16:00');
    const rule = await seedWeeklyRule({ teacherId, studentIds: [studentId], firstStart: first, weeks: 3, minutes: 45 });

    const page = await asRole('admin');
    const drawer = await openLessonDrawer(page, { week: weekOf(first), teacherId, name });
    await drawer.getByRole('button', { name: ar.lessons.event.reschedule }).click();
    const scope = drawer.getByRole('radio', { name: ar.lessons.scope.rule });
    await scope.check();
    const slots = drawer.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['2']} `) });
    await slots.getByRole('button', { name: /17:00/ }).click();
    // The repeat days follow the move: Sunday-only becomes Tuesday-only (ByDayPicker).
    await expect(drawer.getByRole('checkbox', { name: ar.enums.weekday['2'] })).toBeChecked();
    await expect(drawer.getByRole('checkbox', { name: ar.enums.weekday['0'] })).not.toBeChecked();
    await drawer.getByRole('button', { name: ar.lessons.rescheduleSubmit }).click();
    await expect(page.getByRole('status').filter({ hasText: ar.lessons.rescheduled })).toBeVisible();

    // The tapped lesson is the rule's first: the day before it is before the rule starts, so nothing
    // is left (apply_lesson_changes) and the rule ends at once on its start day; all three old lessons are closed.
    expect(await ruleStateOf(rule.ruleId)).toEqual({ status: 'ended', ends_on: sunday });
    const lessons = await lessonsOf(studentId);
    const old = lessons.filter((l) => l.status === 'rescheduled');
    const fresh = lessons.filter((l) => l.status === 'scheduled');
    expect(old.map((l) => l.starts_at.toISOString())).toEqual(rule.lessonIds.map((_, i) => riyadh(addDays(sunday, 7 * i), '16:00').toISOString()));
    expect(fresh.length).toBeGreaterThanOrEqual(3);
    expect(fresh[0]?.starts_at.toISOString()).toBe(riyadh(tuesday, '17:00').toISOString());
    for (const l of fresh) expect([l.starts_at.getUTCDay(), l.starts_at.getUTCHours()]).toEqual([2, 14]);

    // The week now shows the Tuesday lesson, and the guardian got one confirmation, not one per lesson.
    await page.goto(`/admin/schedule?week=${weekOf(first)}&teacher=${teacherId}`);
    await expect(weekGrid(page).getByRole('button', { name: new RegExp(`17:00.*${name}|${name}.*17:00`) })).toHaveCount(1);
    await expect.poll(() => queuedFor(family.guardianId)).toEqual([
      expect.objectContaining({ template_key: expect.stringMatching(/^booking_confirmation/), status: 'queued' }),
    ]);
  });
});
