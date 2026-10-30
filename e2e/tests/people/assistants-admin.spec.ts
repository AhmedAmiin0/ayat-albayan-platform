import { ar, expect, test } from '../../support/core/fixtures';
import { withSql } from '../../support/core/schedule';

// «فريق المبيعات» (R-ASST-02, R-ASST-03, R-ASST-05, owner 2026-10-06): the admin sets an assistant's
// terms (salary + 10 % commission), a student the assistant brought pays their first package in
// full → the commission lands in the ledger, the month's statement carries salary and commission
// per currency (EGP and SAR, never added), and goes draft → approved → paid with a receipt-less pay.

const EMAIL = 'e2e-assistant-admin@e2e.local';
const NAME = 'مسؤولة مبيعات الاختبار';
const PHONE = `+9665${String(Date.now()).slice(-8)}`;

/** The assistant (a base-role sales profile) with every earlier trace of this spec removed. */
async function seedAssistant(): Promise<string> {
  return withSql(async (sql) => {
    const [found] = await sql<{ id: string }[]>`select id from auth.users where email = ${EMAIL}`;
    const id =
      found?.id ??
      (await sql<{ id: string }[]>`insert into auth.users (id, email) values (gen_random_uuid(), ${EMAIL}) returning id`)[0]?.id;
    if (!id) throw new Error('assistant not written');
    await sql`insert into public.profiles (id, role, full_name, tz) values (${id}, 'sales', ${NAME}, 'Asia/Riyadh')
      on conflict (id) do update set role = 'sales', full_name = ${NAME}`;
    await sql`delete from public.assistant_statement_lines where statement_id in (select id from public.assistant_statements where assistant_id = ${id})`;
    await sql`delete from public.assistant_statements where assistant_id = ${id}`;
    await sql`delete from public.assistant_commissions where assistant_id = ${id}`;
    await sql`delete from public.assistant_adjustments where assistant_id = ${id}`;
    await sql`delete from public.assistant_terms where assistant_id = ${id}`;
    return id;
  });
}

/** A student the assistant brought, with a 500 SAR package paid in full now (a trigger earns the commission). */
async function seedPaidStudent(assistantId: string): Promise<void> {
  await withSql(async (sql) => {
    const [g] = await sql<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
      values ('ولي أمر الاختبار', ${PHONE}, 'SA', 'Asia/Riyadh') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, brought_by, brought_at)
      values (${g?.id ?? ''}, 'سهيلة الاختبار', 'سهيلة الاختبار', 'Asia/Riyadh', ${assistantId}, now()) returning id`;
    const [sub] = await sql<{ id: string }[]>`insert into public.subscriptions
      (student_id, package, duration, lessons_total, price, currency, price_source, starts_on)
      values (${s?.id ?? ''}, '8', 30, 8, 500, 'SAR', '{}'::jsonb, (now() at time zone 'Asia/Riyadh')::date) returning id`;
    await sql`insert into public.payments (subscription_id, amount, currency, method, paid_at, kind)
      values (${sub?.id ?? ''}, 500, 'SAR', 'bank', now(), 'payment')`;
  });
}

test.describe('assistants — terms → commission → monthly statement (R-ASST-02, R-ASST-03, R-ASST-05)', () => {
  test('the admin sets the terms, sees the commission and pays the month', async ({ asRole }) => {
    test.setTimeout(120_000);
    const assistantId = await seedAssistant();
    const admin = await asRole('admin');

    // «فريق المبيعات» is in the money section of the nav and lists the assistant without terms.
    await admin.goto('/admin/assistants');
    const row = admin.getByRole('row').filter({ hasText: NAME });
    await expect(row).toContainText(ar.assistants.notSet);
    await row.getByRole('link', { name: NAME }).click();

    // Terms: 3000 EGP a month and 10 % of the first paid package. A percent over 100 is refused in the form.
    const terms = admin.getByRole('form', { name: ar.assistants.terms.title });
    await terms.getByLabel(ar.assistants.terms.salaryAmount).fill('3000');
    await terms.getByLabel(ar.assistants.terms.commissionType).selectOption('percent');
    await terms.getByLabel(ar.assistants.terms.valuePercent).fill('150');
    await terms.getByRole('button', { name: ar.assistants.terms.save }).click();
    await expect(terms.getByText(ar.assistants.error.percent_max_100)).toBeVisible();
    await terms.getByLabel(ar.assistants.terms.valuePercent).fill('10');
    await terms.getByRole('button', { name: ar.assistants.terms.save }).click();
    await expect(terms.getByText(ar.assistants.terms.saved)).toBeVisible();
    const saved = await withSql(
      (sql) => sql<{ commission_type: string; commission_value: string; salary_amount: string }[]>`
        select commission_type, commission_value::text, salary_amount::text from public.assistant_terms where assistant_id = ${assistantId}`,
    );
    expect(saved[0]).toMatchObject({ commission_type: 'percent', commission_value: '10.00', salary_amount: '3000.00' });

    // The brought student pays 500 SAR in full: 10 % = 50 SAR in the ledger, totalled in its own currency.
    await seedPaidStudent(assistantId);
    await admin.reload();
    const ledger = admin.getByRole('table').first();
    await expect(ledger).toContainText('سهيلة الاختبار');
    await expect(ledger).toContainText(ar.assistants.ledger.status.earned);
    await expect(admin.getByText(ar.assistants.ledger.total).locator('..')).toContainText(/50\s*ر\.س/);

    // The month's statement: salary in EGP, commission in SAR, side by side, never added together.
    await admin.getByRole('button', { name: ar.assistants.statements.generate }).click();
    // The row with «التفاصيل» is the statements table's (the ledger above has none) and stays the same row through every status.
    const statement = admin.getByRole('row').filter({ has: admin.getByRole('button', { name: ar.assistants.statements.details }) });
    await expect(statement.getByText(ar.enums.payoutStatus.draft)).toBeVisible();
    await expect(statement).toContainText(/3,?000\s*ج\.م/);
    await expect(statement).toContainText(/50\s*ر\.س/);
    await statement.getByRole('button', { name: ar.payouts.approve }).click();
    await expect(statement.getByText(ar.enums.payoutStatus.approved)).toBeVisible();
    await statement.getByRole('button', { name: ar.payouts.markPaid }).click();
    await admin.getByRole('dialog').getByRole('button', { name: ar.finance.confirmPaid }).click();
    await expect(statement.getByText(ar.enums.payoutStatus.paid)).toBeVisible();
    const status = await withSql((sql) => sql<{ status: string }[]>`select status from public.assistant_statements where assistant_id = ${assistantId}`);
    expect(status.map((r) => r.status)).toEqual(['paid']);
  });

  test('«جُلب بواسطة» on the student profile sets the assistant', async ({ asRole }) => {
    const assistantId = await seedAssistant();
    const studentId = await withSql(async (sql) => {
      const [g] = await sql<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
        values ('ولي أمر آخر', ${`${PHONE.slice(0, -1)}${PHONE.endsWith('7') ? '8' : '7'}`}, 'SA', 'Asia/Riyadh') returning id`;
      const [s] = await sql<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz)
        values (${g?.id ?? ''}, 'جود الاختبار', 'جود الاختبار', 'Asia/Riyadh') returning id`;
      return s?.id ?? '';
    });
    const admin = await asRole('admin');
    await admin.goto(`/admin/students/${studentId}`);
    const section = admin.getByRole('region', { name: ar.assistants.brought.title });
    await expect(section).toContainText(ar.assistants.brought.none);
    await section.getByLabel(ar.assistants.brought.select).selectOption(assistantId);
    await section.getByRole('button', { name: ar.assistants.brought.save }).click();
    await expect(section.getByText(ar.assistants.brought.saved)).toBeVisible();
    const rows = await withSql((sql) => sql<{ brought_by: string }[]>`select brought_by from public.students where id = ${studentId}`);
    expect(rows[0]?.brought_by).toBe(assistantId);
  });
});
