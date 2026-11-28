import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';

// The open thread's side panel (no form bars on the phone): beside the chat once the thread is
// 48rem wide, else behind a thread-header button that opens it as a sheet (docs/66 §2). A 1280px
// desktop window gives the admin thread less than that. getByRole skips the hidden copy, so the
// specs reach the panel the same way at every width.

const PANEL = { lead: ar.inbox.leadPanel, family: ar.inbox.subscription.title } as const;
const OPENER = { lead: ar.inbox.leadSheet, family: ar.inbox.subscriptionSheet } as const;

/** Opens the sheet first unless the panel already shows (beside the chat, or a sheet open). */
export async function sidePanel(page: Page, kind: keyof typeof PANEL): Promise<Locator> {
  const panel = page.getByRole('complementary', { name: PANEL[kind] });
  const opener = page.getByRole('button', { name: OPENER[kind] });
  await expect(opener.or(panel).first()).toBeVisible({ timeout: 30_000 });
  if (!(await panel.isVisible())) await opener.click();
  await expect(panel).toBeVisible();
  return panel;
}
