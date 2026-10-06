import type { Page } from '@playwright/test';
import { brought, one, pay, student, subscription } from '../support/assistant';
import { leadOf } from '../support/assistant-api';
import { seedUser } from '../support/db';
import { ar, expect, test } from '../support/fixtures';
import { fillStable } from '../support/fill';
import { openNav } from '../support/nav';
import { resetAbrar, setAvailability, withSql } from '../support/schedule';
import { USERS } from '../support/users';

// The assistant's portal (R-ASST-01, 04, 05, 06; base role sales, shown «مساعد/ة»): the pages
// «تسجيل طالب», «طلابي», «مدفوعاتي» and «أرباحي». The assistant sees the students they brought, only
// the payments they recorded, and their own commission; no price, no other person's money.
// Needs the API's /sales/me/* and /sales/booking/* routes (the assistant's API task).

const PASSWORD = 'Assistant-e2e-123';
const stamp = String(Date.now()).slice(-6);
/** A Saudi mobile number, unique per run and per family (`n`: 0-9). */
const phone = (tag: number, n: number) => `+9665${stamp}${tag}${n}`;

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(ar.auth.email).fill(email);
  await page.getByLabel(ar.auth.password).fill(PASSWORD);
  await page.getByRole('button', { name: ar.auth.submit }).click();
  await page.waitForURL('**/sales/**');
}

/** The assistant's section nav: in the page from 900px, in the opened «القائمة» sheet below it. */
const salesNav = async (page: Page) => (await openNav(page)).getByRole('navigation', { name: ar.sales.nav.label });

/** A sales login whose terms are 10 % of a first paid subscription and 2000 SAR a month. */
async function seedAssistant(tag: number): Promise<{ email: string; id: string }> {
  const email = `zahraa-${stamp}-${tag}@e2e.local`;
  const id = await seedUser({ email, password: PASSWORD, role: 'sales', fullName: 'الزهراء' });
  await withSql(
    (sql) => sql`insert into public.assistant_terms (assistant_id, commission_type, commission_value, commission_starts_on,
        salary_amount, salary_currency, salary_starts_on)
      values (${id}, 'percent', 10, '2026-01-01', 2000, 'SAR', '2026-01-01')`,
  );
  return { email, id };
}

/** Two families I brought (one paid in full, one not) and one nobody brought, paid by the admin. */
async function seedFamilies(by: string, names: { paid: string; unpaid: string; other: string }): Promise<void> {
  const admin = one(await withSql((sql) => sql<{ id: string }[]>`select id from auth.users where email = ${USERS.admin.email}`));
  await withSql((sql) =>
    sql.begin(async (tx) => {
      const a = await brought(tx, { by, phone: phone(1, 1), price: 1000 });
      const b = await brought(tx, { by, phone: phone(1, 2), price: 800 });
      const other = await student(tx, { phone: phone(1, 3) });
      for (const [id, name] of [[a.student, names.paid], [b.student, names.unpaid], [other, names.other]] as const) {
        await tx`update public.students set name = ${name}, name_normalized = ${name} where id = ${id}`;
      }
      await pay(tx, a.sub, { amount: 1000, by });
      await pay(tx, await subscription(tx, other, { price: 777 }), { amount: 777, by: admin.id });
    }),
  );
}

test.describe('assistant portal', () => {
  test('«طلابي», «مدفوعاتي» and «أرباحي» show only what is mine: no other family, no other payment, no price', async ({ browser }) => {
    const { email, id } = await seedAssistant(1);
    const names = { paid: `مسددة${stamp}`, unpaid: `منتظرة${stamp}`, other: `بعيدة${stamp}` };
    await seedFamilies(id, names);
    const page = await (await browser.newContext({ locale: 'ar' })).newPage();
    await signIn(page, email);

    // Below 900px the section nav sits behind «القائمة»: salesNav opens it (the mobile project is a Pixel 7).
    for (const label of Object.values(ar.assistantPortal.nav)) await expect((await salesNav(page)).getByRole('link', { name: label })).toBeVisible();

    await (await salesNav(page)).getByRole('link', { name: ar.assistantPortal.nav.students }).click();
    const paid = page.getByRole('row').filter({ hasText: names.paid });
    await expect(paid).toContainText(ar.assistantPortal.students.paid);
    await expect(paid).toContainText(ar.assistantPortal.commission.earned);
    await expect(paid).toContainText('100'); // 10 % of the 1000 SAR package
    await expect(page.getByRole('row').filter({ hasText: names.unpaid })).toContainText(ar.assistantPortal.students.unpaid);
    await expect(page.getByText(names.other)).toHaveCount(0);

    await (await salesNav(page)).getByRole('link', { name: ar.assistantPortal.nav.payments }).click();
    await expect(page.getByRole('row').filter({ hasText: names.paid })).toContainText('1,000');
    await expect(page.getByText(names.other)).toHaveCount(0);
    await expect(page.getByText('777')).toHaveCount(0);

    await (await salesNav(page)).getByRole('link', { name: ar.assistantPortal.nav.earnings }).click();
    await expect(page.getByRole('heading', { name: ar.assistantPortal.earnings.terms })).toBeVisible();
    await expect(page.getByText(ar.assistantPortal.earnings.commissionPercent.replace('{value}', '10'))).toBeVisible();
    await expect(page.getByText(ar.assistantPortal.earnings.statementsEmpty)).toBeVisible();
  });

  test('«تسجيل طالب»: a guardian + student + trial with «أبرار»; the student is credited to me', async ({ browser }) => {
    const { email, id } = await seedAssistant(2);
    await setAvailability(await resetAbrar(), [[0, '16:00', '18:00']]);
    const name = `ناشئة${stamp}`;
    const page = await (await browser.newContext({ locale: 'ar' })).newPage();
    await signIn(page, email);

    // Without a chat the page points to the inbox: the API books a new family only from her own lead.
    await (await salesNav(page)).getByRole('link', { name: ar.assistantPortal.nav.register }).click();
    await expect(page.getByRole('heading', { level: 1, name: ar.assistantPortal.register.title })).toBeVisible();
    await expect(page.getByRole('link', { name: ar.assistantPortal.register.openInbox })).toBeVisible();
    const leadId = await leadOf(id, phone(2, 1));
    await page.goto(`/sales/register?leadId=${leadId}&phone=${encodeURIComponent(phone(2, 1))}&name=${encodeURIComponent(name)}`);
    await expect(page.getByText(ar.booking.kind.label)).toHaveCount(0);
    await fillStable(page.getByLabel(ar.leads.studentName), name);
    await fillStable(page.getByLabel(ar.guardians.phone), phone(2, 1));
    await fillStable(page.getByLabel(ar.guardians.name), `أم ${name}`);
    const next = () => page.getByRole('button', { name: ar.booking.next }).click();
    await next();
    await page.getByRole('radio', { name: /أبرار/ }).check();
    await next();
    await expect(page.getByText(ar.booking.trialFree)).toBeVisible();
    await expect(page.getByText(/ر\.س|\$/)).toHaveCount(0); // no price anywhere
    await next();
    const step = page.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
    await next();
    await page.getByRole('button', { name: ar.booking.submit }).click();
    await expect(page.getByRole('heading', { name: ar.booking.booked })).toBeVisible();

    const rows = await withSql((sql) => sql<{ brought_by: string | null; has_at: boolean }[]>`
      select brought_by, brought_at is not null as has_at from public.students where name = ${name}`);
    expect(rows).toEqual([{ brought_by: id, has_at: true }]);

    // «طلابي» lists the new student, first subscription not paid yet.
    await page.getByRole('link', { name: ar.assistantPortal.register.openMyStudents }).click();
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText(ar.assistantPortal.students.unpaid);
  });
});
