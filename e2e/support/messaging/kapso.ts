import type { LineCheckView, WaProvider } from '@ab/shared';
import { expect, type Page } from '@playwright/test';
import { API, bearer } from '../core/messages';
import { withSql } from '../core/schedule';
import { stub, STUB_URL } from '../core/wa-stub';

// The kapso driver in e2e (docs/19): the notifications line is switched in the database's
// integration config (as «التكاملات» would), tools/wa-stub plays Kapso under /kapso, and its
// fake key and webhook secret come from playwright.config.ts (E2E_KAPSO). No hosted service.

/** = playwright.config.ts E2E_KAPSO; tools/wa-stub's Kapso prefix and its version. */
export const KAPSO_BASE = `${STUB_URL}/kapso`;

const WAIT = { timeout: 30_000, intervals: [500, 1_000, 2_000] };

/** The API's view of each line (POST /messaging/lines/check as the signed-in admin). */
async function lines(admin: Page): Promise<LineCheckView[]> {
  const res = await fetch(`${API}/messaging/lines/check`, { method: 'POST', headers: await bearer(admin) });
  if (!res.ok) throw new Error(`lines check: ${res.status}`);
  return (await res.json()) as LineCheckView[];
}

/**
 * kapso: WA_PROVIDER=kapso and KAPSO_API_BASE in integration_config; meta: both rows deleted (the
 * env default, meta, applies again). Waits until the API's overlay refresh shows the line under it.
 */
export async function switchNotifications(admin: Page, provider: WaProvider): Promise<void> {
  await withSql(async (sql) => {
    if (provider === 'kapso') {
      await sql`insert into public.integration_config (key, value) values ('WA_PROVIDER', 'kapso'), ('KAPSO_API_BASE', ${KAPSO_BASE})
        on conflict (key) do update set value = excluded.value`;
    } else {
      await sql`delete from public.integration_config where key in ('WA_PROVIDER', 'KAPSO_API_BASE')`;
    }
  });
  await expect
    .poll(async () => (await lines(admin)).find((l) => l.line === 'notifications'), WAIT)
    .toEqual(expect.objectContaining({ provider, configured: true, gaps: [] }));
}

interface StubRequest {
  via: 'graph' | 'kapso';
  method: string;
  path: string;
  auth: 'api-key' | 'bearer' | 'oauth' | 'none';
}

/** Every Graph call the stub got since the last reset, with its prefix and credential kind. */
export const stubRequests = () => stub<StubRequest[]>('/__stub/requests');

/** A guardian writes; «Kapso» forwards Meta's raw payload to /webhooks/kapso, signed (or not). */
export const kapsoInbound = (spec: { from: string; name?: string; text: string; signWith?: string }) =>
  stub<{ id: string; status: number }>('/__stub/kapso/inbound', spec);
