import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { balanceOf } from '../../support/finance/money';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedLesson } from '../../support/schedule';
import {
  cancelStateOf,
  openLessonDrawer,
  riyadhDay,
  ruleStateOf,
  seedPaidStudent,
  seedWeeklyRule,
  setLateCancelHours,
  weekGrid,
  weekOf,
} from '../../support/teaching/schedule-extra';

// Cancelling from the lesson drawer (R-SCH-07, CancelForm): who cancelled decides whether the
// lesson consumes the package. Teacher/admin never; a student only when late_cancel_hours says so.

const HOUR = 3_600_000;
const tag = () => String(Date.now()).slice(-4);

interface CancelInput {
  at: Date;
  teacherId: string;
  name: string;
  by: string;
  scope?: string;
  reason: string;
}

/** Drawer «إلغاء الحلقة» → who, scope, why → submit; waits for the toast. */
async function cancelFromDrawer(page: Page, i: CancelInput): Promise<void> {
  const drawer = await openLessonDrawer(page, { week: weekOf(i.at), teacherId: i.teacherId, name: i.name, at: i.at });
  await drawer.getByRole('button', { name: ar.lessons.cancelSubmit }).click();
  const form = drawer.getByRole('form', { name: ar.lessons.cancelTitle });
  await form.getByRole('radio', { name: i.by }).check();
  if (i.scope) await form.getByRole('radio', { name: i.scope }).check();
  await form.getByLabel(ar.lessons.reason).fill(i.reason);
  await form.getByRole('button', { name: ar.lessons.cancelSubmit }).click();
  const done = i.scope === ar.lessons.scope.rule ? ar.lessons.seriesCancelled : ar.lessons.cancelled;
  await expect(page.getByRole('status').filter({ hasText: done })).toBeVisible();
}

test.describe('cancel a lesson (R-SCH-07)', () => {
  test.afterEach(async () => {
    await setLateCancelHours(null);
  });

  test('cancelled by the teacher: cancelled_by_teacher, not chargeable, the balance is unchanged', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    const name = `ليان${tag()}`;
    const seed = await seedPaidStudent({ teacherId, guardian: `أم ${name}`, student: name });
    const startsAt = riyadh(addDays(nextWeekSaturday(), 1), '16:00');
    const lessonId = await seedLesson({ teacherId, studentId: seed.studentId, startsAt, minutes: 45 });
    expect((await balanceOf(seed.subscriptionId))?.remaining).toBe(3);

    const page = await asRole('admin');
    await cancelFromDrawer(page, { at: startsAt, teacherId, name, by: ar.lessons.by.teacher, reason: 'ظرف طارئ' });
    await expect(weekGrid(page).getByRole('button', { name: new RegExp(name) })).toHaveCount(0);
    expect(await cancelStateOf(lessonId)).toEqual({ status: 'cancelled_by_teacher', cancel_reason: 'ظرف طارئ', chargeable: false });
    expect((await balanceOf(seed.subscriptionId))?.remaining).toBe(3);
  });

  test('late_cancel_hours = 24: a student cancelling 10 h ahead is charged, 72 h ahead is free', async ({ asRole }) => {
    await setLateCancelHours(24);
    const teacherId = await resetAbrar();
    const name = `جنى${tag()}`;
    const seed = await seedPaidStudent({ teacherId, guardian: `أم ${name}`, student: name });
    const soon = new Date(Date.now() + 10 * HOUR);
    const later = new Date(Date.now() + 72 * HOUR);
    const lateId = await seedLesson({ teacherId, studentId: seed.studentId, startsAt: soon, minutes: 45 });
    const earlyId = await seedLesson({ teacherId, studentId: seed.studentId, startsAt: later, minutes: 45 });

    const page = await asRole('admin');
    const student = { teacherId, name, by: ar.lessons.by.student, reason: 'سفر' };
    await cancelFromDrawer(page, { ...student, at: soon });
    expect(await cancelStateOf(lateId)).toEqual({ status: 'excused', cancel_reason: 'سفر', chargeable: true });
    expect((await balanceOf(seed.subscriptionId))?.remaining).toBe(2); // 3 → 2: the late cancel used a lesson

    await cancelFromDrawer(page, { ...student, at: later });
    expect(await cancelStateOf(earlyId)).toEqual({ status: 'excused', cancel_reason: 'سفر', chargeable: false });
    expect((await balanceOf(seed.subscriptionId))?.remaining).toBe(2); // early cancel: free
  });

  test('«هذه الحلقة وكل ما بعدها»: later open lessons are cancelled and the rule ends the day before', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    const name = `ريتال${tag()}`;
    const seed = await seedPaidStudent({ teacherId, guardian: `أم ${name}`, student: name });
    const first = riyadh(addDays(nextWeekSaturday(), 1), '16:00');
    const rule = await seedWeeklyRule({ teacherId, studentIds: [seed.studentId], firstStart: first, weeks: 4, minutes: 45 });
    const second = new Date(first.getTime() + 7 * 24 * HOUR);

    const page = await asRole('admin');
    await cancelFromDrawer(page, { at: second, teacherId, name, by: ar.lessons.by.admin, scope: ar.lessons.scope.rule, reason: 'وقف الحلقات' });
    const states = await Promise.all(rule.lessonIds.map((id) => cancelStateOf(id)));
    expect(states.map((s) => s?.status)).toEqual(['scheduled', 'cancelled_by_admin', 'cancelled_by_admin', 'cancelled_by_admin']);
    expect(states.slice(1).every((s) => s?.chargeable === false)).toBe(true);
    // The end date is in the future, so the rule stays active until it passes (migration 112).
    expect(await ruleStateOf(rule.ruleId)).toEqual({ status: 'active', ends_on: addDays(riyadhDay(second), -1) });
    expect((await balanceOf(seed.subscriptionId))?.remaining).toBe(3);
  });
});
