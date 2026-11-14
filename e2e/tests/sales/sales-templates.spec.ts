import { seedUser } from '../../support/core/db';
import { ar, expect, test } from '../../support/core/fixtures';
import { withSql } from '../../support/core/schedule';
import { salesNav, signInSales } from '../../support/sales/sales-portal';
import { SINGLE_LINE } from '../../support/messaging/wa-lines';
import { stubReset } from '../../support/core/wa-stub';

// «القوالب» for sales (owner 2026-11-14, templates.author): a salesperson writes a template; it
// goes straight to Meta (tools/wa-stub) on the chat number, flagged for the allow-list, and shows
// «قيد المراجعة» until Meta's review. Local Supabase + the stub only; no real Meta call.

const stamp = Date.now();
const KEY = `e2e_offer_${String(stamp).slice(-8)}`;
const t = ar.templates;

test.describe('sales templates (owner 2026-11-14)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line to send a new template from');
  test.beforeEach(async () => {
    await stubReset();
  });
  test.afterEach(async () => {
    await withSql((sql) => sql`delete from public.message_templates where key = ${KEY}`);
  });

  test('a salesperson creates a template: on the chat line, flagged, «قيد المراجعة»', async ({ browser }) => {
    test.setTimeout(90_000);
    const email = `tpl-${stamp}@e2e.local`;
    await seedUser({ email, password: 'Assistant-e2e-123', role: 'sales', fullName: 'كاتبة القوالب' });
    const page = await signInSales(browser, email);
    await (await salesNav(page)).getByRole('link', { name: t.author.nav }).click();
    await page.waitForURL(/\/sales\/templates\/?$/);

    await page.getByRole('button', { name: t.author.new }).click();
    await page.getByLabel(t.author.key).fill(KEY);
    await page.getByLabel(t.create.body, { exact: true }).fill('عرض خاص لهذا الشهر يا {{1}} في الأكاديمية');
    await expect(page.getByLabel(t.create.category)).toHaveValue('marketing');
    await page.getByLabel(t.create.sample.replace('{n}', '1')).fill('أحمد');
    await page.getByRole('button', { name: t.author.submit }).click();

    await expect(page.getByText(t.author.submitted.replace('{name}', KEY))).toBeVisible();
    const card = page.getByRole('listitem').filter({ hasText: KEY });
    await expect(card.getByText(t.author.status.pending)).toBeVisible();
    const rows = await withSql((sql) =>
      sql<{ line: string; sales_starter: boolean; status: string; created_by: string | null }[]>`
        select line, sales_starter, status, created_by from public.message_templates where key = ${KEY}`);
    expect(rows).toEqual([expect.objectContaining({ line: 'chat', sales_starter: true, status: 'pending' })]);
    expect(rows[0]?.created_by).toBeTruthy();
  });
});
