import { expect, type Page } from '@playwright/test';
import { withSql } from './core/schedule';

/** The e2e API (playwright.config.ts webServer, port 3100). */
export const API = 'http://localhost:3100';

/** The signed-in user's Supabase access token, from the page's own session. */
export async function accessToken(page: Page): Promise<string> {
  // The context's storage state, not page.evaluate: a fresh page on about:blank cannot read localStorage.
  const { origins } = await page.context().storageState();
  const entries = origins.flatMap((o) => o.localStorage).filter((e) => e.name.endsWith('-auth-token'));
  for (const { value } of entries) {
    const token = (JSON.parse(value) as { access_token?: string }).access_token;
    if (token) return token;
  }
  throw new Error('no Supabase session in the page');
}

/** The page's own session as bearer headers for direct API calls. */
export async function bearer(page: Page): Promise<{ authorization: string }> {
  return { authorization: `Bearer ${await accessToken(page)}` };
}

/** A fresh Saudi wa_id (digits, no +) so desktop and mobile projects never share a lead. */
export function freshDigits(): string {
  return `9665${String(Date.now()).slice(-8)}`;
}

interface LeadSeed {
  phone: string;
  name?: string;
  status?: string;
  source?: string;
  lastInboundHoursAgo?: number;
}

/** Inserts a lead directly (E.164 phone). */
export async function seedLead(input: LeadSeed): Promise<string> {
  return withSql(async (sql) => {
    const hours = input.lastInboundHoursAgo ?? 1;
    const [row] = await sql<{ id: string }[]>`
      insert into public.leads (phone_e164, name, status, source, last_inbound_at)
      values (${input.phone}, ${input.name ?? null}, ${input.status ?? 'new'}::public.lead_status,
        ${input.source ?? 'whatsapp_direct'}::public.lead_source,
        now() - make_interval(hours => ${hours}))
      returning id`;
    if (!row) throw new Error('lead not written');
    return row.id;
  });
}

/** A settings row (jsonb value). */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await withSql((sql) => sql`
    insert into public.settings (key, value) values (${key}, ${sql.json(value as never)})
    on conflict (key) do update set value = excluded.value`);
}

export interface MessageRow {
  template_key: string | null;
  body: string | null;
  status: string;
  error_code: string | null;
  created_by: string | null;
  direction: string;
}

/** Every message row for an E.164 phone, oldest first. */
export async function messagesFor(phoneE164: string): Promise<MessageRow[]> {
  return withSql((sql) => sql<MessageRow[]>`
    select template_key, body, status, error_code, created_by, direction
    from public.messages where phone_e164 = ${phoneE164} order by created_at`);
}

/** Direct API GET as the page's user, asserting the status. */
export async function apiStatus(page: Page, path: string): Promise<number> {
  const res = await page.request.get(`${API}${path}`, { headers: await bearer(page) });
  expect(res.status()).toBeGreaterThan(0);
  return res.status();
}
