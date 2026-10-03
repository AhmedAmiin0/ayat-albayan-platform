import { ar, expect, test } from '../support/fixtures';
import { guardianPhoneOf, uniqueName } from '../support/money-extra';
import { seedFamily, withSql } from '../support/schedule';

// The link no other spec covers (R-LEAD-01, R-SUB-01, R-PAY-01): a lead whose trial is done became
// a guardian + student; the admin subscribes from the STUDENT PROFILE (chat-subscribe.spec does it
// from the chat, journey 3 starts from a seeded package) → the lead is «مشترك» and linked to the
// guardian → the package is unpaid → the payment makes it active. Journeys 1 and chat-subscribe own
// the trial booking itself.

interface LeadRow {
  status: string;
  converted_guardian_id: string | null;
}

const leadOf = async (phone: string): Promise<LeadRow | undefined> =>
  (await withSql((sql) => sql<LeadRow[]>`select status, converted_guardian_id from public.leads where phone_e164 = ${phone}`))[0];

const packageOf = async (studentId: string): Promise<{ status: string; paid: number }[]> =>
  withSql((sql) => sql<{ status: string; paid: number }[]>`
    select s.status, coalesce((select sum(p.amount) from public.payments p where p.subscription_id = s.id), 0)::float as paid
    from public.subscriptions s where s.student_id = ${studentId}`);

test.describe('trial lead → subscription → payment → active', () => {
  test('subscribing from the profile converts the lead; paying activates the package', async ({ asRole }) => {
    const student = uniqueName('هالة');
    const family = await seedFamily('أم هالة', [student]);
    const studentId = family.studentIds[0] ?? '';
    const phone = await guardianPhoneOf(family.guardianId);
    const name = uniqueName('عميلة');
    await withSql((sql) => sql`insert into public.leads (phone_e164, name, status) values (${phone}, ${name}, 'trial_done')`);

    const page = await asRole('admin');
    await page.goto(`/admin/leads?q=${encodeURIComponent(phone.slice(1))}`);
    const lead = page.getByRole('listitem').filter({ hasText: name });
    await expect(lead).toContainText(ar.enums.leadStatus.trial_done);

    // «اشتراك جديد» on the profile: the calculator defaults, saved.
    await page.goto(`/admin/students/${studentId}`);
    const card = page.getByRole('region', { name: ar.subscriptions.balance });
    await card.getByRole('button', { name: ar.subscriptions.new }).click();
    await page.getByRole('dialog', { name: ar.subscriptions.new }).getByRole('button', { name: ar.common.save }).click();
    await expect(page.getByRole('status')).toHaveText(ar.subscriptions.saved);
    await expect(card.getByText(ar.enums.subscriptionStatus.unpaid, { exact: true })).toBeVisible();
    expect(await packageOf(studentId)).toEqual([{ status: 'unpaid', paid: 0 }]);
    expect(await leadOf(phone)).toEqual({ status: 'converted', converted_guardian_id: family.guardianId });

    // The payment (full price, the dialog's default) → active.
    await card.getByRole('button', { name: ar.payments.record }).click();
    await page.getByRole('dialog', { name: new RegExp(student) }).getByRole('button', { name: ar.payments.record, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(ar.payments.saved);
    await expect.poll(async () => (await packageOf(studentId))[0]?.status).toBe('active');
    await expect(card.getByText(ar.enums.subscriptionStatus.active, { exact: true })).toBeVisible();

    // The lead list now says «مشترك» for the same person.
    await page.goto(`/admin/leads?q=${encodeURIComponent(phone.slice(1))}`);
    await expect(lead).toContainText(ar.enums.leadStatus.converted);
  });
});
