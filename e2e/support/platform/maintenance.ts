import type { Page, Response } from '@playwright/test';

/** GET /settings/public, the one request the cover asks (owner 2026-11-21, «تحت الصيانة»). */
export const PUBLIC_SETTINGS = '**/settings/public';

/**
 * Stubs the admin switch in THIS page only (the real setting is never flipped): the API's real
 * answer (route.fetch keeps its CORS headers) with maintenance_mode set to `on.value`.
 */
export async function stubSwitch(page: Page, on: { value: boolean }): Promise<void> {
  await page.route(PUBLIC_SETTINGS, async (route) => {
    const response = await route.fetch();
    const body: unknown = await response.json();
    await route.fulfill({ response, json: { ...(body as object), maintenance_mode: on.value } });
  });
}

/** The next answer of the switch's request (the cover has its verdict once it is in). */
export const switchAnswer = (page: Page): Promise<Response> =>
  page.waitForResponse((r) => r.url().endsWith('/settings/public'));
