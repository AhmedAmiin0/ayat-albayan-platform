import { test as setup } from '@playwright/test';
import { loginViaUi } from '../support/fixtures';
import { authFile, USERS } from '../support/users';

for (const role of Object.keys(USERS) as (keyof typeof USERS)[]) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await loginViaUi(page, role);
    await page.waitForURL(`**/${role}`);
    await page.context().storageState({ path: authFile(role) });
  });
}
