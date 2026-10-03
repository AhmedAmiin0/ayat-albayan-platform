import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily, seedLesson, setAvailability, withSql } from '../support/schedule';
import { STUB_URL, setMessaging, stubReset, stubSent, stubTemplateStatus, type StubSent } from '../support/wa-stub';

// «رأيك يهمّنا» (owner 2026-10-03): admin presses «ابعت طلب الرأي» on a completed lesson → the
// WhatsApp stub gets the template with the signed token as the button value → the guardian opens
// /feedback/<token> (no login) and answers → the answer shows in the admin list and in the
// teacher's own list. Also a wrong token and an expired one. «Meta» is tools/wa-stub.

const TEMPLATE = 'lesson_feedback_request';
const NOTE = 'ما شاء الله، المعلمة صبورة جدًا';

/** The template exists on the stub and is approved there and in the DB (an explicit admin action in prod). */
async function approveTemplate(): Promise<void> {
  const created = await fetch(`${STUB_URL}/v21.0/e2e-waba/message_templates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer e2e-token' },
    body: JSON.stringify({
      name: TEMPLATE,
      language: 'ar',
      category: 'UTILITY',
      components: [
        { type: 'BODY', text: 'شكرًا لثقتكم بينا في حلقة {{1}} مع {{2}}. رأيكم يهمنا', example: { body_text: [['سهيلة', 'أبرار']] } },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'رأيك يهمّنا', url: 'http://localhost:5180/feedback/{{1}}', example: ['http://localhost:5180/feedback/sample'] }] },
      ],
    }),
  });
  expect([200, 400]).toContain(created.status); // 400 = left over from an earlier run (already exists)
  await stubTemplateStatus(TEMPLATE, 'APPROVED');
  await withSql(async (sql) => {
    const rows = await sql`update public.message_templates set status = 'approved' where key = ${TEMPLATE} returning key`;
    expect(rows, 'the migration seeds the lesson_feedback_request template').toHaveLength(1);
  });
}

/** A student with a completed lesson next week (the API only asks about lessons that took place). */
async function completedLesson(teacherId: string, student: string): Promise<{ lessonId: string; studentId: string; guardianId: string }> {
  const family = await seedFamily(`أم ${student}`, [student]);
  const [studentId = ''] = family.studentIds;
  const startsAt = riyadh(addDays(nextWeekSaturday(), 1), '14:00');
  const lessonId = await seedLesson({ teacherId, studentId, startsAt, minutes: 45 });
  await withSql(async (sql) => {
    await sql`update public.lessons set status = 'completed' where id = ${lessonId}`;
    await sql`update public.lesson_students set attendance = 'on_time' where lesson_id = ${lessonId}`;
  });
  return { lessonId, studentId, guardianId: family.guardianId };
}

async function press(admin: Page, teacherId: string, student: string): Promise<void> {
  await admin.goto(`/admin/schedule?week=${nextWeekSaturday()}&teacher=${teacherId}`);
  const grid = admin.getByRole('table', { name: ar.schedule.grid }).or(admin.getByRole('group', { name: ar.schedule.grid }));
  await grid.getByRole('button', { name: new RegExp(student) }).click();
  await admin.getByRole('dialog', { name: student }).getByRole('button', { name: ar.feedback.sendRequest }).click();
  await expect(admin.getByRole('button', { name: ar.feedback.requestSent })).toBeDisabled();
}

/** The link's token: the template's URL button value, as the stub captured it. */
async function tokenSentTo(guardianId: string): Promise<string> {
  const phone = await withSql(async (sql) => {
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${guardianId}`;
    return (g?.phone_e164 ?? '').replace(/\D/g, '');
  });
  let token = '';
  await expect
    .poll(async () => {
      const sent: StubSent[] = (await stubSent()).filter((m) => m.template === TEMPLATE && m.to.replace(/\D/g, '') === phone);
      const body = sent[0]?.body as { template?: { components?: { type: string; parameters?: { text?: string }[] }[] } } | undefined;
      token = body?.template?.components?.find((c) => c.type === 'button')?.parameters?.[0]?.text ?? '';
      return token;
    }, { timeout: 60_000 })
    .not.toBe('');
  return token;
}

test.describe('رأيك يهمّنا (feedback)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
    await approveTemplate();
  });

  test('admin sends → the guardian answers by the link → admin list and teacher list show it', async ({ asRole, browser }) => {
    test.setTimeout(180_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '10:00', '22:00']]);
    const lesson = await completedLesson(teacherId, 'سهيلة');
    const admin = await asRole('admin');
    await press(admin, teacherId, 'سهيلة');

    // The guardian: a clean browser, no session.
    const token = await tokenSentTo(lesson.guardianId);
    const guardian = await (await browser.newContext({ locale: 'ar' })).newPage();
    await guardian.goto(`/feedback/${token}`);
    await expect(guardian.getByLabel(ar.feedback.teacher)).toHaveValue('أبرار');
    // The lesson’s own kind is chosen for her (the server sets it): exactly one radio is on.
    await expect(guardian.getByRole('group', { name: ar.feedback.kind }).locator('input:checked')).toHaveCount(1);
    await expect(guardian.getByLabel(ar.feedback.contact)).not.toHaveValue('');
    await guardian.getByRole('radio', { name: ar.feedback.rowRating.replace('{n}', '5') }).check({ force: true });
    await guardian.getByRole('radio', { name: ar.enums.feedbackRecommend.yes }).check({ force: true });
    await guardian.getByLabel(ar.feedback.note).fill(NOTE);
    await guardian.getByRole('button', { name: ar.feedback.submit }).click();
    await expect(guardian.getByText(ar.feedback.thanksTitle)).toBeVisible();

    // A second visit says it was received, and offers no form.
    await guardian.reload();
    await expect(guardian.getByText(ar.feedback.alreadySent)).toBeVisible();
    await expect(guardian.getByRole('button', { name: ar.feedback.submit })).toHaveCount(0);

    // Admin: the row with the teacher's average above it.
    await admin.goto('/admin/feedback');
    const row = admin.getByRole('row').filter({ hasText: 'سهيلة' });
    await expect(row).toContainText(ar.feedback.outOf.replace('{n}', '5'));
    await expect(row).toContainText(ar.enums.feedbackRecommend.yes);
    await expect(row).toContainText(NOTE);
    await expect(admin.getByRole('region', { name: ar.feedback.averages })).toContainText('5.0');

    // Teacher: only her rows (no phone), and her average.
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher/feedback');
    await expect(teacher.getByRole('row').filter({ hasText: 'سهيلة' })).toContainText(NOTE);
    await expect(teacher.getByRole('region', { name: ar.feedback.averages })).toContainText('5.0');
    await expect(teacher.locator('body')).not.toContainText('+966');
    await guardian.context().close();
  });

  test('a wrong token and an expired one both say so and show no form', async ({ asRole, browser }) => {
    test.setTimeout(180_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '10:00', '22:00']]);
    const lesson = await completedLesson(teacherId, 'جود');
    await press(await asRole('admin'), teacherId, 'جود');
    const token = await tokenSentTo(lesson.guardianId);

    const guardian = await (await browser.newContext({ locale: 'ar' })).newPage();
    await guardian.goto('/feedback/not-a-real-token');
    await expect(guardian.getByText(ar.feedback.expired)).toBeVisible();
    await expect(guardian.getByRole('button', { name: ar.feedback.submit })).toHaveCount(0);

    await withSql((sql) => sql`update public.lesson_feedback set expires_at = now() - interval '1 day' where lesson_id = ${lesson.lessonId}`);
    await guardian.goto(`/feedback/${token}`);
    await expect(guardian.getByText(ar.feedback.expired)).toBeVisible();
    await expect(guardian.getByRole('button', { name: ar.feedback.submit })).toHaveCount(0);
    await guardian.context().close();
  });
});
