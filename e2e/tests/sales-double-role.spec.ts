import type { Page } from '@playwright/test';
import { family, makeAssistant, message, paymentBy, TAG } from '../support/assistant-api';
import { one } from '../support/assistant';
import { ar, expect, test } from '../support/fixtures';
import { openNav } from '../support/nav';
import { withSql } from '../support/schedule';

// Sales double role (owner 2026-10-11, docs/16): the salesperson also does the classroom assistant's job.
// She reads a chat that is not hers, opens the history of a confirmed subscription she made (no money),
// sees the teachers and every student, and a lesson running now with «ادخل الحلقة».

const PASSWORD = 'Assistant-e2e-123';
const salesNav = async (page: Page) => (await openNav(page)).getByRole('navigation', { name: ar.sales.nav.label });

/** My student with a confirmed (active) package paid 333, taught by a fresh teacher, in a lesson running now. */
async function seedMine(input: { salesId: string; name: string; teacher: string }): Promise<{ phone: string }> {
  const mine = await family(input.salesId, input.name);
  await withSql(async (sql) => {
    const t = one(await sql<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz)
      values (${input.teacher}, 'female', '{quran}', 'Asia/Riyadh') returning id`);
    await sql`update public.students set teacher_id = ${t.id} where id = ${mine.student}`;
    const sub = one(await sql<{ id: string }[]>`insert into public.subscriptions
      (student_id, package, duration, lessons_total, price, currency, price_source, starts_on, status)
      values (${mine.student}, '8', 30, 8, 333, 'SAR', '{}'::jsonb, current_date, 'active') returning id`);
    await paymentBy(sub.id, input.salesId, 333);
    const l = one(await sql<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at, status)
      values (${t.id}, now() - interval '5 minutes', now() + interval '40 minutes', 'confirmed') returning id`);
    await sql`insert into public.lesson_students (lesson_id, student_id) values (${l.id}, ${mine.student})`;
  });
  return { phone: mine.phone };
}

test.describe('sales double role', () => {
  test('a chat that is not hers, a confirmed subscription history, teachers, all students and a running lesson', async ({ browser }) => {
    const me = await makeAssistant(`dr${test.info().project.name}`);
    const other = await makeAssistant(`do${test.info().project.name}`);
    const names = { mine: `مؤكدة${TAG}`, foreign: `نسرين${TAG}`, teacher: `معلمة${TAG}`, says: `سلام عليكم ${TAG}` };
    const foreign = await family(other.id, names.foreign);
    await message({ phone: foreign.phone, guardian: foreign.guardian, direction: 'inbound', body: names.says });
    await seedMine({ salesId: me.id, name: names.mine, teacher: names.teacher });

    const page = await (await browser.newContext({ locale: 'ar' })).newPage();
    await page.goto('/login');
    await page.getByLabel(ar.auth.email).fill(me.email);
    await page.getByLabel(ar.auth.password).fill(PASSWORD);
    await page.getByRole('button', { name: ar.auth.submit }).click();
    await page.waitForURL('**/sales/**');

    // Another salesperson's family: the chat opens and reads (it was 403 before).
    await page.goto(`/sales/inbox?phone=${encodeURIComponent(foreign.phone)}`);
    await expect(page.getByText(names.says)).toBeVisible();

    // The landing's block of running lessons leads to /sales/live: my student's lesson, «ادخل الحلقة» open.
    await page.goto('/sales/inbox');
    await page.getByRole('link', { name: ar.sales.live.open }).click();
    const lesson = page.getByRole('listitem').filter({ hasText: names.mine });
    await expect(lesson).toContainText(names.teacher);
    await expect(lesson.getByRole('link', { name: ar.classroom.enter })).toBeVisible();

    await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.teachers }).click();
    await expect(page.getByRole('row').filter({ hasText: names.teacher })).toContainText(names.mine);

    await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.allStudents }).click();
    await page.getByRole('searchbox', { name: ar.sales.allStudents.search }).fill(names.foreign);
    await expect(page.getByRole('row').filter({ hasText: names.foreign })).toContainText(`أم ${names.foreign}`);

    await page.goto('/sales/subscriptions?kind=confirmed');
    await page.getByRole('button', { name: ar.sales.history.openFor.replace('{name}', names.mine) }).click();
    const history = page.getByRole('region', { name: ar.sales.history.title.replace('{name}', names.mine) });
    await expect(history).toContainText(ar.sales.history.current);
    await expect(history).toContainText(ar.enums.paymentKind.payment);
    await expect(history).not.toContainText('333');
  });
});
