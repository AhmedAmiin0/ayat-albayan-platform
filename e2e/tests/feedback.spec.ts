import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { approveTemplate, completedLesson, tokenSentTo, unapproveTemplate } from '../support/feedback';
import { nextWeekSaturday, resetAbrar, setAvailability, withSql } from '../support/schedule';
import { setMessaging, stubReset } from '../support/wa-stub';

// «رأيك يهمّنا» (owner 2026-10-03): admin presses «أرسل طلب الرأي» on a completed lesson → the
// WhatsApp stub gets the template with the signed token as the button value → the guardian opens
// /feedback/<token> (no login) and answers → the answer shows in the admin list and in the
// teacher's own list. Also a wrong token and an expired one. «Meta» is tools/wa-stub.

const NOTE = 'ما شاء الله، المعلمة صبورة جدًا';
/** Desktop and mobile run this spec on one DB: a fresh name per run keeps the rows apart. */
const fresh = (name: string) => `${name} ${String(Date.now()).slice(-4)}`;

/** The radios are visually hidden: a person taps the label around them. */
const pick = (page: Page, name: string) => page.getByRole('radio', { name }).locator('xpath=ancestor::label').click();

async function press(admin: Page, teacherId: string, student: string): Promise<void> {
  await admin.goto(`/admin/schedule?week=${nextWeekSaturday()}&teacher=${teacherId}`);
  const grid = admin.getByRole('table', { name: ar.schedule.grid }).or(admin.getByRole('group', { name: ar.schedule.grid }));
  await grid.getByRole('button', { name: new RegExp(student) }).click();
  await admin.getByRole('dialog', { name: student }).getByRole('button', { name: ar.feedback.sendRequest }).click();
  await expect(admin.getByRole('button', { name: ar.feedback.requestSent })).toBeDisabled();
}

test.describe('رأيك يهمّنا (feedback)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
    await approveTemplate();
  });

  // The feedback rows reference the lessons that resetAbrar() deletes in every later spec, and the
  // journeys after this one assert `queued` (messaging off), so leave neither behind.
  test.afterEach(async () => {
    await setMessaging(false);
    await withSql((sql) => sql`delete from public.lesson_feedback`);
    await unapproveTemplate();
  });

  test('admin sends → the guardian answers by the link → admin list and teacher list show it', async ({ asRole, browser }) => {
    test.setTimeout(180_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '10:00', '22:00']]);
    const student = fresh('سهيلة');
    const lesson = await completedLesson(teacherId, student);
    const admin = await asRole('admin');
    await press(admin, teacherId, student);

    // The guardian: a clean browser, no session.
    const token = await tokenSentTo(lesson.guardianId);
    const guardian = await (await browser.newContext({ locale: 'ar' })).newPage();
    await guardian.goto(`/feedback/${token}`);
    await expect(guardian.getByLabel(ar.feedback.teacher)).toHaveValue('أبرار');
    // The lesson’s own kind is shown as a fixed line (the server sets it); the number is hers to correct.
    await expect(guardian.getByText(ar.enums.feedbackKind.subscription)).toBeVisible();
    await expect(guardian.getByRole('radio', { name: ar.enums.feedbackKind.subscription })).toHaveCount(0);
    await expect(guardian.getByLabel(ar.feedback.contact)).toBeEditable();
    await expect(guardian.getByLabel(ar.feedback.contact)).not.toHaveValue('');
    await pick(guardian, ar.feedback.rowRating.replace('{n}', '5'));
    await pick(guardian, ar.enums.feedbackRecommend.yes);
    await guardian.getByLabel(ar.feedback.note).fill(NOTE);
    await guardian.getByRole('button', { name: ar.feedback.submit }).click();
    await expect(guardian.getByText(ar.feedback.thanksTitle)).toBeVisible();

    // A second visit says it was received, and offers no form.
    await guardian.reload();
    await expect(guardian.getByText(ar.feedback.alreadySent)).toBeVisible();
    await expect(guardian.getByRole('button', { name: ar.feedback.submit })).toHaveCount(0);

    // Admin: the row with the teacher's average above it.
    await admin.goto('/admin/feedback');
    const row = admin.getByRole('row').filter({ hasText: student });
    await expect(row).toContainText(ar.feedback.outOf.replace('{n}', '5'));
    await expect(row).toContainText(ar.enums.feedbackRecommend.yes);
    await expect(row).toContainText(NOTE);
    await expect(admin.getByRole('region', { name: ar.feedback.averages })).toContainText('5.0');

    // Teacher: only her rows (no phone), and her average.
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher/feedback');
    await expect(teacher.getByRole('row').filter({ hasText: student })).toContainText(NOTE);
    await expect(teacher.getByRole('region', { name: ar.feedback.averages })).toContainText('5.0');
    await expect(teacher.locator('body')).not.toContainText('+966');
    await guardian.context().close();
  });

  test('a wrong token and an expired one each say so, show no form and name the way to a new link', async ({ asRole, browser }) => {
    test.setTimeout(180_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '10:00', '22:00']]);
    const student = fresh('جود');
    const lesson = await completedLesson(teacherId, student);
    await press(await asRole('admin'), teacherId, student);
    const token = await tokenSentTo(lesson.guardianId);

    const guardian = await (await browser.newContext({ locale: 'ar' })).newPage();
    await guardian.goto('/feedback/not-a-real-token');
    await expect(guardian.getByText(ar.feedback.invalid)).toBeVisible();
    await expect(guardian.getByRole('link', { name: ar.feedback.openWhatsapp })).toBeVisible();
    await expect(guardian.getByRole('button', { name: ar.feedback.submit })).toHaveCount(0);

    await withSql((sql) => sql`update public.lesson_feedback set expires_at = now() - interval '1 day' where lesson_id = ${lesson.lessonId}`);
    await guardian.goto(`/feedback/${token}`);
    await expect(guardian.getByText(ar.feedback.expired)).toBeVisible();
    await expect(guardian.getByRole('button', { name: ar.feedback.submit })).toHaveCount(0);
    await guardian.context().close();
  });
});
