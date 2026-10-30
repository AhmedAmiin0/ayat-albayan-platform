import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../fixtures';

// The open thread's side panel (owner, 2026-10-05: no form bars on the phone): beside / under the
// chat from 900px, behind a thread-header button that opens a full-screen sheet below 900px (the
// mobile project's Pixel 7 is 412px wide). Specs reach the panel the same way on both projects.

const PANEL = { lead: ar.inbox.leadPanel, family: ar.inbox.subscription.title } as const;
const OPENER = { lead: ar.inbox.leadSheet, family: ar.inbox.subscriptionSheet } as const;

/** True below the shell breakpoint (900px), where the open chat is full-screen and the panel a sheet. */
const isPhone = (page: Page): boolean => (page.viewportSize()?.width ?? 1280) < 900;

/**
 * The lead panel («العميل») or the family's packages («الاشتراك») of the open thread. On a phone
 * it opens the sheet first unless it is already open; elsewhere it is the inline aside.
 */
export async function sidePanel(page: Page, kind: keyof typeof PANEL): Promise<Locator> {
  const panel = page.getByRole('complementary', { name: PANEL[kind] });
  if (!isPhone(page)) return panel;
  const opener = page.getByRole('button', { name: OPENER[kind] });
  await expect(opener.or(panel).first()).toBeVisible({ timeout: 30_000 });
  if (!(await panel.isVisible())) await opener.click();
  await expect(panel).toBeVisible();
  return panel;
}
