import type { Browser, Page } from '@playwright/test';
import { family, paymentBy } from './assistant-api';
import { one } from './assistant';
import { ar } from './fixtures';
import { openNav } from './nav';
import { withSql } from './schedule';

// The sales portal e2e (docs/16, owner report 2026-10-12): sign-in, nav and the seeds it reads.

const PASSWORD = 'Assistant-e2e-123';

export const salesNav = async (page: Page) => (await openNav(page)).getByRole('navigation', { name: ar.sales.nav.label });

/** A salesperson's page, signed in through the login form (Arabic UI). */
export async function signInSales(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext({ locale: 'ar' })).newPage();
  await page.goto('/login');
  await page.getByLabel(ar.auth.email).fill(email);
  await page.getByLabel(ar.auth.password).fill(PASSWORD);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await page.waitForURL('**/sales/**');
  return page;
}

/** A fresh teacher; a lesson of theirs for the student starting `minutes` from now (negative = running). */
async function teacherWithLesson(input: { student: string; teacher: string; minutes: number }): Promise<string> {
  return withSql(async (sql) => {
    const t = one(await sql<{ id: string }[]>`insert into public.teachers (display_name_ar, gender, programs, tz)
      values (${input.teacher}, 'female', '{quran}', 'Asia/Riyadh') returning id`);
    await sql`update public.students set teacher_id = ${t.id} where id = ${input.student}`;
    const l = one(await sql<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at, status)
      values (${t.id}, now() + make_interval(mins => ${input.minutes}), now() + make_interval(mins => ${input.minutes + 45}), 'confirmed')
      returning id`);
    await sql`insert into public.lesson_students (lesson_id, student_id) values (${l.id}, ${input.student})`;
    return t.id;
  });
}

/** My student with a confirmed (active) package paid 333, taught by a fresh teacher, in a lesson running now. */
export async function seedMine(input: { salesId: string; name: string; teacher: string }): Promise<{ phone: string }> {
  const mine = await family(input.salesId, input.name);
  await teacherWithLesson({ student: mine.student, teacher: input.teacher, minutes: -5 });
  await withSql(async (sql) => {
    const sub = one(await sql<{ id: string }[]>`insert into public.subscriptions
      (student_id, package, duration, lessons_total, price, currency, price_source, starts_on, status)
      values (${mine.student}, '8', 30, 8, 333, 'SAR', '{}'::jsonb, current_date, 'active') returning id`);
    await paymentBy(sub.id, input.salesId, 333);
  });
  return { phone: mine.phone };
}

/** A booked family that never wrote: a lesson tomorrow, no message on its number. */
export async function seedBooked(input: { name: string; teacher: string }): Promise<{ phone: string; guardian: string }> {
  const booked = await family(null, input.name);
  await teacherWithLesson({ student: booked.student, teacher: input.teacher, minutes: 24 * 60 });
  return { phone: booked.phone, guardian: booked.guardian };
}

/** «قالب بدء محادثة للمبيعات» set in the DB, as the admin's switch does (owner 2026-10-12): sales send only these. */
export async function setSalesStarter(key: string, on: boolean): Promise<void> {
  await withSql((sql) => sql`update public.message_templates set sales_starter = ${on} where key = ${key}`);
}

/** Removes a registry row the health check imported (no foreign key points at message_templates). */
export async function dropTemplate(key: string): Promise<void> {
  await withSql((sql) => sql`delete from public.message_templates where key = ${key}`);
}
