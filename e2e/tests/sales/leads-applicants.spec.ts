import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { openFilters, showResults } from '../../support/core/filters';
import { freshDigits, seedLead } from '../../support/messages';
import { riyadhToday, summaryOf, uniqueName } from '../../support/finance/money-extra';
import { withSql } from '../../support/schedule';

// Leads list (R-LEAD-01/02/04, issue C4): status tabs and source filter narrow the list (the header
// count is GET /leads `total`), search finds a lead by name and by phone, and «نقل لطلبات التوظيف»
// moves a lead to /admin/job-applicants, out of the funnel. Four leads share one name token, so
// every count below is exact in the shared DB. (The list has no status-change control: that lives
// in the chat thread.)

const count = (n: number) => ar.leads.count.replace('{n}', String(n));
const byStatus = (n: number, status: keyof typeof ar.enums.leadStatus) =>
  ar.leads.countStatus.replace('{n}', String(n)).replace('{status}', ar.enums.leadStatus[status]);

async function seedFour(tag: string): Promise<{ phones: string[]; names: string[] }> {
  const base = Number(freshDigits());
  const plan = [
    ['new', 'facebook_ad'],
    ['new', 'whatsapp_direct'],
    ['contacted', 'facebook_ad'],
    ['no_reply', 'whatsapp_direct'],
  ] as const;
  const phones: string[] = [];
  const names: string[] = [];
  for (const [i, [status, source]] of plan.entries()) {
    phones.push(`+${base + i}`);
    names.push(`${tag}${'أبجد'.charAt(i)}`);
    await seedLead({ phone: `+${base + i}`, name: names[i], status, source });
  }
  return { phones, names };
}

const search = async (page: Page, term: string) => {
  const box = page.getByRole('searchbox', { name: ar.common.search, exact: true });
  await box.fill(term);
  await box.press('Enter');
};

async function jobApplicantsWith(phone: string): Promise<{ from_lead_id: string | null; name: string | null }[]> {
  return withSql((sql) => sql<{ from_lead_id: string | null; name: string | null }[]>`
    select from_lead_id, name from public.job_applicants where phone_e164 = ${phone}`);
}

test.describe('leads list and job applicants (R-LEAD-01/04)', () => {
  test('tabs, source filter and search narrow the list; the reclassified lead moves to job applicants', async ({ asRole }) => {
    const tag = uniqueName('عميل').replace(' ', '');
    const { phones, names } = await seedFour(tag);
    const [phone, name] = [phones[0] ?? '', names[0] ?? ''];
    const page = await asRole('admin');
    const funnelBefore = (await summaryOf(page, { from: riyadhToday(), to: riyadhToday() })).funnel['new'] ?? 0;

    // The unfiltered header is the SQL total.
    await page.goto('/admin/leads');
    const [total] = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n from public.leads`);
    await expect(page.getByText(count(total?.n ?? -1), { exact: true })).toBeVisible();

    // One name token → our four; each status tab and the source filter narrow it.
    await search(page, tag);
    await expect(page.getByText(count(4), { exact: true })).toBeVisible();
    const tab = (s: keyof typeof ar.enums.leadStatus) => page.getByRole('tab', { name: ar.enums.leadStatus[s], exact: true });
    await tab('contacted').click();
    await expect(page.getByText(byStatus(1, 'contacted'), { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: names[2] ?? '' })).toBeVisible();
    await tab('new').click();
    await expect(page.getByText(byStatus(2, 'new'), { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: ar.leads.filterAll, exact: true }).click();
    // The source filter lives in the shared «تصفية» panel (owner, 2026-10-05): the button counts it.
    let panel = await openFilters(page);
    await panel.getByLabel(ar.leads.source, { exact: true }).selectOption('facebook_ad');
    await showResults(panel);
    await expect(page.getByText(count(2), { exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: names[1] ?? '' })).toHaveCount(0);
    panel = await openFilters(page);
    await panel.getByLabel(ar.leads.source, { exact: true }).selectOption('');
    await showResults(panel);

    // Search by phone finds exactly that lead, with its E.164 number and status chip.
    await search(page, phone.slice(1));
    await expect(page.getByText(count(1), { exact: true })).toBeVisible();
    const row = page.getByRole('listitem').filter({ hasText: name });
    await expect(row).toContainText(ar.enums.leadStatus.new);
    await expect(row).toContainText(ar.enums.leadSource.facebook_ad);

    // Reclassify: the strip asks first, «أبقِها هنا» keeps it, the move removes it from the list.
    await row.getByRole('button', { name: ar.leads.reclassifyRow.replace('{name}', name) }).click();
    const confirm = page.getByRole('group', { name: ar.leads.reclassifyAsApplicant });
    await expect(confirm).toContainText(ar.leads.reclassifyConfirm);
    await confirm.getByRole('button', { name: ar.leads.keepHere }).click();
    await expect(confirm).toBeHidden();
    expect(await jobApplicantsWith(phone)).toEqual([]);
    const leadId = await withSql((sql) => sql<{ id: string }[]>`select id from public.leads where phone_e164 = ${phone}`);
    await row.getByRole('button', { name: ar.leads.reclassifyRow.replace('{name}', name) }).click();
    await confirm.getByRole('button', { name: ar.leads.reclassifyAsApplicant }).click();
    await expect(page.getByRole('status')).toHaveText(ar.leads.reclassified);
    await expect(page.getByText(ar.leads.empty)).toBeVisible();

    // The lead row is deleted, so from_lead_id goes null (on delete set null); the audit keeps the link.
    expect(await jobApplicantsWith(phone)).toEqual([{ from_lead_id: null, name }]);
    const moved = await withSql((sql) => sql`
      select 1 from public.audit_log where entity_id = ${leadId[0]?.id ?? ''} and action = 'reclassify_to_job_applicant'`);
    expect(moved).toHaveLength(1);
    const left = await withSql((sql) => sql`select 1 from public.leads where phone_e164 = ${phone}`);
    expect(left).toHaveLength(0);

    // The applicants page lists it; the dashboard funnel no longer counts it.
    await page.goto('/admin/job-applicants');
    const [applicants] = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n from public.job_applicants`);
    await expect(page.getByText(ar.jobApplicants.count.replace('{n}', String(applicants?.n ?? -1)), { exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
    const funnelAfter = (await summaryOf(page, { from: riyadhToday(), to: riyadhToday() })).funnel['new'] ?? 0;
    expect(funnelAfter).toBe(funnelBefore - 1);
  });
});
