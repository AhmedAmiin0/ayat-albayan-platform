import { ar, expect, test } from '../../support/core/fixtures';
import { openNav } from '../../support/core/nav';
import { withSql } from '../../support/core/schedule';

// Short links (docs/19): sends stay failed / template_not_approved until the template is approved.

const S = ar.shortLinks;
const TARGET = 'https://meet.google.com/kdw-pqhr-xab';

const titleFor = (project: string) => `رابط e2e ${project} ${Date.now() % 100_000}`;

async function failedSends(title: string): Promise<{ status: string; error: string | null }[]> {
  return withSql((sql) => sql<{ status: string; error: string | null }[]>`
    select u.send_status as status, u.send_error as error
    from public.short_link_users u join public.short_links l on l.code = u.code
    where l.title = ${title}`);
}

test.describe('short links («الروابط المختصرة»)', () => {
  let title = '';
  test.beforeEach(() => {
    title = titleFor(test.info().project.name);
  });
  test.afterEach(async () => {
    await withSql((sql) => sql`delete from public.short_links where title = ${title}`);
  });

  test('admin: create → list → detail → revoke', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/admin');
    await (await openNav(page)).getByRole('link', { name: ar.nav.shortLinks }).click();
    await expect(page).toHaveURL(/\/admin\/short-links$/);
    await expect(page.getByRole('heading', { level: 1, name: S.title })).toBeVisible();

    await page.getByRole('button', { name: S.new }).first().click();
    const form = page.getByRole('dialog', { name: S.form.title });
    await form.getByLabel(S.form.titleLabel).fill(title);
    await form.getByLabel(S.form.target).fill(TARGET);
    await form.getByText(S.audience.listed, { exact: true }).click();
    await form.getByLabel(S.form.addPeople).fill('أبرار');
    // Only search results: a picked name also shows as a pill.
    const results = form.getByRole('list', { name: S.people.results });
    const match = results.getByRole('listitem').filter({ hasText: 'أبرار' }).first();
    await match.getByRole('button', { name: S.form.add }).click();
    await expect(match.getByRole('button', { name: S.people.picked })).toBeVisible();
    await form.getByRole('switch', { name: S.form.sendWhatsapp }).check();
    await form.getByRole('button', { name: S.form.createAndSend }).click();

    // The new link opens on its own page: the QR, and the send recorded as refused.
    await expect(page).toHaveURL(/\/admin\/short-links\/[A-Za-z0-9]{8,}$/);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('img', { name: S.detail.qr })).toBeVisible();
    const users = page.getByRole('table', { name: S.detail.users });
    await expect(users).toContainText('أبرار');
    await expect(users).toContainText(S.send.failed);
    await expect(users).toContainText(S.detail.sendErrors.template_not_approved);
    const failed = [{ status: 'failed', error: 'template_not_approved' }];
    expect(await failedSends(title)).toEqual(failed);

    // The list has it, active, opening the same page.
    await page.getByRole('main').getByRole('link', { name: S.detail.back }).click();
    await page.getByRole('searchbox', { name: S.list.search }).fill(title);
    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toContainText(S.state.active);
    await row.getByRole('link', { name: title }).click();

    await page.getByRole('button', { name: S.detail.revoke }).click();
    const confirm = page.getByRole('dialog', { name: S.detail.revokeTitle });
    await confirm.getByRole('button', { name: S.detail.revokeConfirm }).click();
    await expect(page.getByRole('status')).toHaveText(S.detail.revoked);
    await expect(page.getByRole('button', { name: S.detail.revoke })).toHaveCount(0);
    await expect(page.getByText(S.state.revoked).first()).toBeVisible();
  });

  test('a target outside the allow-list is refused on its field', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/admin/short-links');
    await page.getByRole('button', { name: S.new }).first().click();
    const form = page.getByRole('dialog', { name: S.form.title });
    await form.getByLabel(S.form.titleLabel).fill(title);
    await form.getByLabel(S.form.target).fill('https://example.com/form');
    await form.getByRole('button', { name: S.form.create }).click();
    await expect(form.getByText(S.form.errors.target_not_allowed)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/short-links$/);
  });
});
