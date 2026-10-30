import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../fixtures';
import { withSql } from '../schedule';

// «أيام الحلقات» in journey 7 (owner 2026-10-18): right after «اشتراك جديد» the assistant books the weekly
// course of the subscription she sold: the plan's days a week (the weekly plan = 1), each with its time from
// the teacher's free slots; the course stops after the plan's lessons (ends_on on every rule).

const B = ar.booking;

/**
 * From the open transfer step: «احجز أيام الحلقات الآن» → «أبرار» → next Sunday 16:00 Riyadh → review (the
 * course end) → «احجز» → «ارجع للمحادثة», back on the transfer step.
 */
export async function bookCourseDays(page: Page, transfer: Locator): Promise<void> {
  await transfer.getByRole('button', { name: B.bookCourseDays }).click();
  const dialog = page.getByRole('dialog', { name: B.courseDays });
  const next = () => dialog.getByRole('button', { name: B.next }).click();
  await dialog.getByRole('radio', { name: /أبرار/ }).check(); // preselected when she is the student's teacher
  await next();
  const step = dialog.getByRole('region', { name: B.steps.slot });
  await expect(step.getByText(B.pickNDays.one)).toBeVisible();
  await expect(dialog.getByRole('button', { name: B.next })).toBeDisabled();
  await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
  await step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
  await expect(step.getByText(B.seriesFree)).toBeVisible(); // a clash would block her (no override)
  await next();
  const review = dialog.getByRole('region', { name: B.steps.review });
  await expect(review.getByText(B.dayAt.replace('{day}', ar.enums.weekday['0']).replace('{time}', '16:00'))).toBeVisible();
  await expect(review.getByText(new RegExp(B.courseEnds.few.split('{date}')[0] ?? ''))).toBeVisible();
  await expect(review.getByLabel(B.meetingLink)).toHaveCount(0);
  await dialog.getByRole('button', { name: B.submit }).click();
  await expect(dialog.getByRole('heading', { name: B.booked })).toBeVisible();
  await dialog.getByRole('button', { name: ar.inbox.subscription.backToChat }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: ar.salesMoney.stepTransfer })).toBeVisible();
}

/** The student's course rules (not the trial): their end day and lessons, credited to `createdBy`. */
export async function courseOf(studentId: string): Promise<{ ends_on: string | null; lessons: number; created_by: string | null }[]> {
  return withSql((sql) => sql<{ ends_on: string | null; lessons: number; created_by: string | null }[]>`
    select to_char(r.ends_on, 'YYYY-MM-DD') as ends_on, r.created_by,
      (select count(*)::int from public.lessons l where l.rule_id = r.id) as lessons
    from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id
    where rs.student_id = ${studentId} and r.package is distinct from 'trial'`);
}
