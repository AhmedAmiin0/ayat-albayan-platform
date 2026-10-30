import { makeAssistant, message, tokenOf } from '../../support/sales/assistant-api';
import { fromChatMore } from '../../support/sales/assistant-journey';
import { ar, expect, test } from '../../support/core/fixtures';
import { freshDigits } from '../../support/core/messages';
import { signInSales } from '../../support/sales/sales-portal';
import { trialFamily } from '../../support/sales/sales-money';
import { resetSales } from '../../support/sales/sales-options';
import { withSql } from '../../support/core/schedule';
import { USERS } from '../../support/core/users';

// Owner 2026-10-12 (docs/16 rows 23, 24, 26), in the browser: in her family's chat the salesperson checks
// the number («تحقق من التسجيل») and sees the start-date field of «اشتراك جديد»; the admin unticks
// «تحديد تاريخ بداية الاشتراك» on the built-in sales role in «الأدوار والصلاحيات», and after a reload the
// field is gone («تبدأ الباقة اليوم»). The sales role's defaults are restored at the end.

const P = ar.permissions.page;
const SM = ar.salesMoney;

test.describe('sales start date: the admin can switch it off', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'one run: it changes the sales role'));
  test.afterAll(async ({ request }) => {
    await resetSales(request, await tokenOf(USERS.admin.email, USERS.admin.password));
  });

  test('check the chat number, see the field, revoke it, the field disappears', async ({ asRole, browser }) => {
    const me = await makeAssistant('srt');
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `تسنيم${digits.slice(-4)}`;
    const student = await trialFamily({ broughtBy: me.id, phone, name });
    const [g] = await withSql((sql) => sql<{ guardian_id: string }[]>`select guardian_id from public.students where id = ${student}`);
    await message({ phone, guardian: g?.guardian_id ?? '', direction: 'inbound', body: `السلام عليكم ${digits.slice(-4)}` });

    const page = await signInSales(browser, me.email);
    await page.goto(`/sales/inbox?phone=${encodeURIComponent(phone)}`);
    await fromChatMore(page, ar.registrationCheck.action);
    const check = page.getByRole('dialog', { name: ar.registrationCheck.title });
    await expect(check.getByText(name)).toBeVisible();
    await check.getByRole('button', { name: ar.registrationCheck.close }).first().click();

    await page.getByRole('button', { name: SM.newSubscription }).click();
    await expect(page.getByLabel(SM.startsOn)).toBeVisible();
    await expect(page.getByRole('checkbox', { name: new RegExp(SM.alreadyStarted) })).toBeVisible();

    const admin = await asRole('admin');
    await admin.goto('/admin/roles');
    // The built-in sales role is named «المبيعات» (migration 20261006000289).
    await admin.getByRole('button', { name: `${P.edit} المبيعات`, exact: true }).click();
    const dialog = admin.getByRole('dialog', { name: P.editRole });
    await dialog.getByRole('checkbox', { name: ar.permissions.items['subscriptions.set_start_date'], exact: true }).uncheck();
    await dialog.getByRole('button', { name: P.save }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: SM.newSubscription }).click();
    await expect(page.getByText(SM.startsOnDefault.split('(')[0]?.trim() ?? '')).toBeVisible();
    await expect(page.getByLabel(SM.startsOn)).toHaveCount(0);
  });
});
