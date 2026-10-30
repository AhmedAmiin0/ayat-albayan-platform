import { expect, type Locator } from '@playwright/test';

/**
 * Fills a field and re-fills until the value survives a short settle: the booking wizard's first
 * paint (lead answered from cache) is re-mounted by dev StrictMode right after it appears, which
 * drops text typed in that first ~20 ms.
 */
export async function fillStable(field: Locator, value: string): Promise<void> {
  await expect(async () => {
    await field.fill(value);
    await field.page().waitForTimeout(300);
    await expect(field).toHaveValue(value, { timeout: 500 });
  }).toPass({ timeout: 15_000 });
}
