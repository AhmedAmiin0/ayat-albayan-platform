import type { Browser } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { AR_LOCALE } from '../../support/core/locale';
import { USERS } from '../../support/core/users';
import {
  catchGateTarget,
  freshLinkCode,
  seedGateLink,
} from '../../support/platform/short-link-gate';

// The web gate /l/<code> of a managed short link (docs/19 «Gate flow», boards
// docs/design/short-links/LinkXGate*): a signed-in user opens it as themself; a full, listed,
// expired, revoked or unknown link says why it does not open.

const G = ar.shortLinks.gate;
const continueAs = `${G.continueAs} ${USERS.admin.fullName}`;

test.describe('the short-link gate for a signed-in user', () => {
  test('«متابعة باسم…» opens the link and goes to its target', async ({ asRole }) => {
    const code = await seedGateLink({ title: 'لقاء الأسر' });
    const page = await asRole('admin');
    await catchGateTarget(page);
    await page.goto(`/l/${code}`);
    await expect(page.getByRole('heading', { name: 'لقاء الأسر' })).toBeVisible();
    await expect(page.getByRole('button', { name: G.signOut })).toBeVisible();
    await page.getByRole('button', { name: continueAs }).click();
    await expect(page).toHaveURL(/gate-target\.example\.test\/landing\?from=gate$/);
  });

  test('a link whose visitors are all in: «اكتمل العدد…»', async ({ asRole }) => {
    const code = await seedGateLink({ maxUsers: 1, visitors: ['+201000000931'] });
    const page = await asRole('admin');
    await page.goto(`/l/${code}`);
    await page.getByRole('button', { name: continueAs }).click();
    await expect(page.getByRole('heading', { name: G.fullTitle })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/l/${code}$`));
  });

  test('a link for listed people only: restricted, with «أكّد رقمًا آخر»', async ({ asRole }) => {
    const code = await seedGateLink({ audience: 'listed', phones: ['+201000000932'] });
    const page = await asRole('admin');
    await page.goto(`/l/${code}`);
    await page.getByRole('button', { name: continueAs }).click();
    await expect(page.getByRole('heading', { name: G.restrictedTitle })).toBeVisible();
    await page.getByRole('button', { name: G.otherPhone }).click();
    await expect(page.getByText(G.phoneTitle)).toBeVisible();
  });
});

test.describe('the short-link gate\'s dead ends', () => {
  const visit = async (browser: Browser, code: string) => {
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await page.goto(`/l/${code}`);
    return page;
  };

  test('an unknown code: «لم نجد هذا الرابط»', async ({ browser }) => {
    const page = await visit(browser, freshLinkCode());
    await expect(page.getByRole('heading', { name: G.notFoundTitle })).toBeVisible();
  });

  test('a revoked link: «أُلغي هذا الرابط»', async ({ browser }) => {
    const page = await visit(browser, await seedGateLink({ status: 'revoked' }));
    await expect(page.getByRole('heading', { name: G.revokedTitle })).toBeVisible();
  });

  test('an expired link: «انتهت صلاحية الرابط», the title never shown', async ({ browser }) => {
    const page = await visit(browser, await seedGateLink({ status: 'expired', title: 'سرّي' }));
    await expect(page.getByRole('heading', { name: G.expiredTitle })).toBeVisible();
    await expect(page.getByText('سرّي')).toHaveCount(0);
  });
});
