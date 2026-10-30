import type { Page } from '@playwright/test';
import { brought, one, pay, student, subscription } from '../../support/sales/assistant';
import { leadOf } from '../../support/sales/assistant-api';
import { seedUser } from '../../support/core/db';
import { ar, expect, test } from '../../support/core/fixtures';
import { fillStable } from '../../support/core/fill';
import { openNav } from '../../support/core/nav';
import { resetAbrar, setAvailability, withSql } from '../../support/core/schedule';
import { USERS } from '../../support/core/users';
import { stubInbound } from '../../support/core/wa-stub';
import { AR_LOCALE } from '../../support/core/locale';

// The assistant's portal (R-ASST-01, 04, 05, 06; base role sales, shown «المبيعات»): «تسجيل طالب جديد»
// in a chat, and the pages «طلابي», «مدفوعاتي» and «أرباحي». The assistant sees the students they brought, only
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
  test('«طلابي» (in «الطلاب»), «مدفوعاتي» and «أرباحي» show only what is mine: no other family, no other payment, no price', async ({ browser }) => {
    const { email, id } = await seedAssistant(1);
    const names = { paid: `مسددة${stamp}`, unpaid: `منتظرة${stamp}`, other: `بعيدة${stamp}` };
    await seedFamilies(id, names);
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await signIn(page, email);

    // Below 900px the section nav sits behind «القائمة»: salesNav opens it (the mobile project is a Pixel 7).
    // Owner 2026-10-12: «طلابي» is a filter of «الطلاب», «مدفوعاتي» a filter of «أرباحي».
    for (const label of [ar.sales.nav.allStudents, ar.assistantPortal.nav.earnings]) await expect((await salesNav(page)).getByRole('link', { name: label })).toBeVisible();
    for (const label of [ar.assistantPortal.nav.students, ar.assistantPortal.nav.payments]) await expect((await salesNav(page)).getByRole('link', { name: label })).toHaveCount(0);

    await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.allStudents }).click();
    await page.getByRole('group', { name: ar.sales.views.students }).getByRole('button', { name: ar.assistantPortal.nav.students }).click();
    const paid = page.getByRole('row').filter({ hasText: names.paid });
    await expect(paid).toContainText(ar.assistantPortal.students.paid);
    await expect(paid).toContainText(ar.assistantPortal.commission.earned);
    await expect(paid).toContainText('100'); // 10 % of the 1000 SAR package
    await expect(page.getByRole('row').filter({ hasText: names.unpaid })).toContainText(ar.assistantPortal.students.unpaid);
    await expect(page.getByText(names.other)).toHaveCount(0);

    await (await salesNav(page)).getByRole('link', { name: ar.assistantPortal.nav.earnings }).click();
    const money = page.getByRole('group', { name: ar.sales.views.money });
    await money.getByRole('button', { name: ar.assistantPortal.nav.payments }).click();
    await expect(page.getByRole('row').filter({ hasText: names.paid })).toContainText('1,000');
    await expect(page.getByText(names.other)).toHaveCount(0);
    await expect(page.getByText('777')).toHaveCount(0);

    // «محفظتي» (owner 2026-10-29): «العمولات» | «الكشوف» | «مدفوعاتي»; the terms and statements are «الكشوف».
    await money.getByRole('button', { name: ar.assistantPortal.wallet.views.statements }).click();
    await expect(page.getByRole('heading', { name: ar.assistantPortal.earnings.terms })).toBeVisible();
    await expect(page.getByText(ar.assistantPortal.earnings.commissionPercent.replace('{value}', '10'))).toBeVisible();
    await expect(page.getByText(ar.assistantPortal.earnings.statementsEmpty)).toBeVisible();
  });

  test('«تسجيل طالب جديد» from the chat: a guardian + student + trial with «أبرار»; credited to me; back on the chat', async ({ browser }) => {
    const { email, id } = await seedAssistant(2);
    await setAvailability(await resetAbrar(), [[0, '16:00', '18:00']]);
    const name = `ناشئة${stamp}`;
    const number = phone(2, 1);
    await leadOf(id, number);
    expect((await stubInbound({ from: number.slice(1), name: `أم ${name}`, text: 'السلام عليكم' })).status).toBe(200);
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await signIn(page, email);

    // The standalone page is gone: its old link lands on the sales inbox, on that chat.
    await page.goto(`/sales/register?leadId=x&phone=${encodeURIComponent(number)}`);
    await page.waitForURL(/\/sales\/inbox\?.*phone=/);
    await page.getByRole('button', { name: ar.inbox.registerNew }).click();
    const dialog = page.getByRole('dialog', { name: ar.inbox.registerNew });
    await expect(dialog.getByText(ar.booking.kind.label)).toHaveCount(0);
    await expect(dialog.getByLabel(ar.guardians.phone)).toHaveValue(number);
    await fillStable(dialog.getByLabel(ar.leads.studentName), name);
    await fillStable(dialog.getByLabel(ar.guardians.name), `أم ${name}`);
    const next = () => dialog.getByRole('button', { name: ar.booking.next }).click();
    await next();
    await dialog.getByRole('radio', { name: /أبرار/ }).check();
    await next();
    await expect(dialog.getByText(ar.booking.trialFree)).toBeVisible();
    await expect(dialog.getByText(/ر\.س|\$/)).toHaveCount(0); // no price anywhere
    await next();
    const step = dialog.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
    await next();
    await dialog.getByRole('button', { name: ar.booking.submit }).click();
    await expect(dialog.getByRole('heading', { name: ar.booking.booked })).toBeVisible();
    await dialog.getByRole('button', { name: ar.inbox.subscription.backToChat }).click();
    await expect(dialog).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('phone')).toBe(number);

    const rows = await withSql((sql) => sql<{ brought_by: string | null; has_at: boolean }[]>`
      select brought_by, brought_at is not null as has_at from public.students where name = ${name}`);
    expect(rows).toEqual([{ brought_by: id, has_at: true }]);

    // «طلابي» lists the new student, first subscription not paid yet. On a phone the open chat covers
    // the app chrome (PhoneChat), so leave it through its «رجوع» first, as a person would.
    const chat = page.getByTestId('phone-chat');
    if (await chat.isVisible()) await chat.getByRole('link', { name: ar.common.back }).click();
    await (await salesNav(page)).getByRole('link', { name: ar.sales.nav.allStudents }).click();
    await page.getByRole('group', { name: ar.sales.views.students }).getByRole('button', { name: ar.assistantPortal.nav.students }).click();
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText(ar.assistantPortal.students.unpaid);
  });
});
