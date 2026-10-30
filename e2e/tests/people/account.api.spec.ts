import { accountRow, accountUser } from '../../support/account';
import { seedUser } from '../../support/core/db';
import { expect, test } from '../../support/fixtures';
import { API, bearer } from '../../support/messages';
import { dropLogins, expectSignedIn, signInAs } from '../../support/people/users-control';

// «حسابي» API (R-ACC-02, rule 9): PATCH /me/profile edits only the caller's whitelisted fields.
// A non-admin cannot raise their own role through it: role/role_id are stripped, and a body with
// nothing known is a 400.

const USER = accountUser('account-api');

test.describe('account API: no self role change', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));

  test.beforeAll(async () => {
    await seedUser({ ...USER, role: 'sales' });
  });

  test.afterAll(async () => {
    await dropLogins([USER.email]);
  });

  test('role and role_id in the body are ignored; the name still changes', async ({ browser }) => {
    const page = await signInAs(browser, USER);
    await expectSignedIn(page);
    const headers = await bearer(page);
    const renamed = `${USER.fullName} API`;

    const res = await page.request.patch(`${API}/me/profile`, {
      headers,
      data: { role: 'admin', role_id: null, full_name: renamed },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()) as { full_name: string }).toMatchObject({ full_name: renamed });
    expect(await accountRow(USER.email)).toMatchObject({ role: 'sales', full_name: renamed });

    const only = await page.request.patch(`${API}/me/profile`, { headers, data: { role: 'admin' } });
    expect(only.status()).toBe(400);
    expect((await accountRow(USER.email))?.role).toBe('sales');
    await page.context().close();
  });
});
