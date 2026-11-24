import type { Page } from '@playwright/test';
import { saveDialog, settle } from './capture.ts';
import { isOpener } from './naming.ts';
import { MAX_DIALOGS } from './plan.ts';
import type { IndexEntry, Job } from './screens.types.ts';

/** The page's create and edit buttons, by visible name or aria-label, once each. */
async function openerNames(page: Page): Promise<string[]> {
  const scope = page.locator('main').first();
  const buttons = await scope.getByRole('button').all();
  const names = await Promise.all(
    buttons.map(async (b) =>
      ((await b.getAttribute('aria-label')) ?? (await b.innerText())).trim(),
    ),
  );
  return [...new Set(names.filter(isOpener))].slice(0, MAX_DIALOGS);
}

async function closeDialog(page: Page, url: string): Promise<void> {
  await page.keyboard.press('Escape');
  const left = await page.getByRole('dialog').first().isVisible();
  const moved = !page.url().endsWith(url);
  if (left || moved) {
    await page.goto(url);
    await settle(page);
  }
}

/** Opens each create or edit dialog or sheet on the page, shoots it, and closes it again. */
export async function shootDialogs(job: Job, shot: { page: Page; entry: IndexEntry }) {
  const { page, entry } = shot;
  const names = await openerNames(page);
  for (const [i, name] of names.entries()) {
    await page.locator('main').first().getByRole('button', { name, exact: true }).first().click();
    const dialog = page.getByRole('dialog').first();
    const opened = await dialog
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) {
      await settle(page);
      const reached = `${entry.reached}; opened «${name}»`;
      await saveDialog(job, { page, entry: { ...entry, reached }, n: i + 1 });
    }
    await closeDialog(page, `${job.base}${entry.url}`);
  }
}
