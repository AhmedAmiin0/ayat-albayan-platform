import type { Locator, Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { openThread } from '../../support/messaging/inbox';
import { freshDigits } from '../../support/messages';
import { withSql } from '../../support/schedule';
import { stubInbound, stubReset } from '../../support/wa-stub';
import { sidePanel } from '../../support/messaging/thread-panel';

// Lead qualification in the thread (R-LEAD-03, L1) and the funnel's state machine (R-LEAD-01):
// every «بيانات الطالب» question by its registration-form label lands in leads.qualification, and
// a status move the funnel does not allow is refused in words. Messaging stays off (nothing sent).

const day = ar.enums.weekday;
const L = ar.leads;
const exact = { exact: true } as const;

const leadOf = (phone: string) => withSql((sql) => sql<{ status: string; qualification: unknown }[]>`
  select status, qualification from public.leads where phone_e164 = ${phone}`).then((rows) => rows[0]);

/** «تغيير الحالة» → the option → «غيّر»; the answer is the page's toast. */
async function moveTo(page: Page, status: keyof typeof ar.enums.leadStatus): Promise<void> {
  await page.getByLabel(L.changeStatus, exact).selectOption({ label: ar.enums.leadStatus[status] });
  await page.getByRole('button', { name: ar.inbox.applyStatus, exact: true }).click();
}

/** «تعديل البيانات» in the aside → the titled dialog holding the full qualification form. */
async function openEdit(page: Page): Promise<Locator> {
  const panel = await sidePanel(page, 'lead');
  await panel.getByRole('button', { name: ar.inbox.editLeadData, exact: true }).click({ timeout: 30_000 });
  const form = page.getByRole('dialog', { name: ar.inbox.editLeadDataTitle });
  await expect(form).toBeVisible();
  return form;
}

test.describe('lead qualification and status (R-LEAD-03, R-LEAD-01)', () => {
  test.beforeEach(async () => {
    await stubReset();
  });

  test('the whole form is saved by label, then the status moves; an invalid move is refused', async ({ asRole }) => {
    test.setTimeout(90_000);
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `أم عمر ${digits.slice(-4)}`;
    expect((await stubInbound({ from: digits, name, text: 'عايز أسجل ابني' })).status).toBe(200);
    const admin = await asRole('admin');
    await openThread(admin, name);
    const panel = await sidePanel(admin, 'lead');
    // The aside is short: a summary, then «تعديل البيانات» opens every question in a dialog.
    await expect(panel.getByText(ar.inbox.noLeadData, exact)).toBeVisible({ timeout: 30_000 });
    let form = await openEdit(admin);

    await form.getByLabel(L.studentName, exact).fill('عمر');
    await form.getByLabel(L.studentAge, exact).fill('9');
    await form.getByLabel(L.gender, exact).selectOption({ label: ar.enums.gender.male });
    await form.getByLabel(L.country, exact).fill('مصر');
    await form.getByLabel(L.level, exact).fill('بيقرا بالتهجي');
    await form.getByLabel(L.memorized, exact).fill('جزء عم');
    await form.getByLabel(L.goal, exact).fill('حفظ القرآن');
    await form.getByLabel(L.riwaya, exact).fill('حفص');
    await form.getByRole('checkbox', { name: day['0'], ...exact }).check();
    await form.getByRole('checkbox', { name: day['2'], ...exact }).check();
    const hours = form.getByRole('group', { name: L.preferredTime });
    await hours.getByLabel(ar.availability.from, exact).selectOption('16:00');
    await hours.getByLabel(ar.availability.to, exact).selectOption('18:00');
    await form.getByLabel(L.tz, exact).selectOption('Africa/Cairo');
    await form.getByRole('button', { name: ar.common.save, exact: true }).click();
    await expect(admin.getByRole('status')).toHaveText(ar.inbox.qualificationSaved);
    await expect(form).toBeHidden();
    await expect(panel.getByText('عمر', exact)).toBeVisible();

    expect((await leadOf(phone))?.qualification).toMatchObject({
      student_name: 'عمر', age: 9, gender: 'male', country: 'مصر', level: 'بيقرا بالتهجي',
      memorized: 'جزء عم', goal: 'حفظ القرآن', riwaya: 'حفص', available_days: [0, 2],
      preferred_from: '16:00', preferred_to: '18:00', tz: 'Africa/Cairo',
    });
    // Reload: the form is filled from the saved qualification, not from the page state.
    await admin.reload();
    form = await openEdit(admin);
    await expect(form.getByLabel(L.studentName, exact)).toHaveValue('عمر');
    await expect(form.getByLabel(L.studentAge, exact)).toHaveValue('9');
    await expect(form.getByRole('checkbox', { name: day['2'], ...exact })).toBeChecked();
    await admin.keyboard.press('Escape');
    await expect(form).toBeHidden();

    // new → interested_no_slot is a funnel move; trial_done from there is not.
    await moveTo(admin, 'interested_no_slot');
    await expect(admin.getByRole('status')).toHaveText(ar.inbox.statusSaved);
    expect((await leadOf(phone))?.status).toBe('interested_no_slot');
    await moveTo(admin, 'trial_done');
    await expect(admin.getByRole('status')).toHaveText(L.invalidTransition);
    expect((await leadOf(phone))?.status).toBe('interested_no_slot');
  });
});
