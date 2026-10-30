import { ar, expect, test } from '../../support/core/fixtures';
import { openNav } from '../../support/core/nav';
import { withSql } from '../../support/schedule';

// «الترجمات» (owner, 2026-10-05: dynamic translations): an admin overrides a nav label in
// Arabic; after a reload the sidebar shows it (main.tsx merges GET /i18n/ar/overrides into `t`
// before the first render). «استعادة الأصل» brings the bundled label back on the next load.

const KEY = 'nav.leads';
const EDITED = `${ar.nav.leads} e2e ${Date.now() % 100_000}`;

test.describe('translations («الترجمات»)', () => {
  test.afterEach(async () => {
    await withSql((sql) => sql`delete from public.translation_overrides where key = ${KEY}`);
  });

  test('an Arabic override shows after a reload; restoring brings the original back', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/admin/translations');
    await expect(page.getByRole('heading', { level: 1, name: ar.translations.title })).toBeVisible();
    await expect(page.getByText(ar.translations.applyNote).first()).toBeVisible();

    await page.getByLabel(ar.translations.search, { exact: true }).fill(KEY);
    await page.getByRole('row').filter({ hasText: KEY }).first().click();
    const editor = page.getByRole('dialog', { name: ar.translations.editKey.replace('{key}', KEY) });
    await editor.getByLabel(ar.translations.arabic, { exact: true }).fill(EDITED);
    await editor.getByRole('button', { name: ar.translations.save }).click();
    await expect(page.getByRole('status').filter({ hasText: ar.translations.saved })).toBeVisible();

    // The nav: the sidebar, or the «القائمة» sheet below 900px (closed again with Esc).
    const nav = async () => (await openNav(page)).getByRole('navigation', { name: ar.nav.label });
    await page.reload();
    await expect((await nav()).getByRole('link', { name: EDITED })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByLabel(ar.translations.search, { exact: true }).fill(KEY);
    await expect(page.getByRole('row').filter({ hasText: ar.translations.overridden })).toHaveCount(1);
    await page.getByRole('row').filter({ hasText: KEY }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: ar.translations.restore }).click();
    await expect(page.getByRole('status').filter({ hasText: ar.translations.restored })).toBeVisible();

    await page.reload();
    await expect((await nav()).getByRole('link', { name: new RegExp(`^${ar.nav.leads}`) })).toBeVisible();
    await expect((await nav()).getByRole('link', { name: EDITED })).toHaveCount(0);
  });
});
