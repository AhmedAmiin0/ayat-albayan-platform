import { expect, type Page } from '@playwright/test';
import { ar } from '../core/fixtures';
import { accessToken, API } from '../core/messages';
import { approveReschedule, RESCHEDULE } from './reschedule-template';
import { dropTemplate } from '../sales/sales-portal';
import { withSql } from '../core/schedule';
import { syncNumber } from './template-numbers';

// The restricted template allow-list (owner 2026-10-12): every role without templates.manage or
// templates.send_all (teachers, sales…) lists and sends only the flagged rows. The stub's chat WABA
// has free_trial_invite, welcome_greeting and academy_welcome (tools/wa-stub defaultChatTemplates);
// the chat number's «مزامنة مع Meta» imports all three and flags only the first two. The third default,
// trial_reschedule (owner 2026-10-18), is seeded flagged and listed once Meta approves it on the chat WABA.

/** The imported defaults; with RESCHEDULE, the three restricted defaults. */
const IMPORTED = ['free_trial_invite', 'welcome_greeting'] as const;
export const RESTRICTED = [...IMPORTED, RESCHEDULE] as const;
export const UNFLAGGED = 'academy_welcome';
const CHAT_KEYS = [...IMPORTED, UNFLAGGED];
const NAMES: Record<string, string | undefined> = ar.templates.names;

/** What a composer's picker shows for a key: its Arabic name, else the Meta name. */
export const pickerLabel = (key: string): string => NAMES[key] ?? key;

interface FlagRow {
  key: string;
  line: string;
  sales_starter: boolean;
}

/** The three chat rows' line and flag, key order. */
export async function chatRows(): Promise<FlagRow[]> {
  return withSql((sql) => sql<FlagRow[]>`
    select key, line, sales_starter from public.message_templates where key in ${sql(CHAT_KEYS)} order by key`);
}

/** Removes the chat rows (the boot check or another project's run may have imported them already). */
export async function dropChatRows(): Promise<void> {
  for (const key of CHAT_KEYS) await dropTemplate(key);
}

/**
 * The chat number's «مزامنة مع Meta» re-imports the chat rows with their default flags; then the admin
 * submits trial_reschedule and the stub approves it on the chat WABA, so all three defaults are listed.
 */
export async function importChatRows(admin: Page): Promise<void> {
  await admin.goto('/admin/settings/communications?tab=templates'); // «التواصل» › «القوالب»
  await syncNumber(admin, 'chat');
  await expect.poll(async () => (await chatRows()).length).toBe(CHAT_KEYS.length);
  await approveReschedule(await accessToken(admin));
}

/** GET /messaging/templates as one signed-in user: the keys they may send. */
export async function listedKeys(token: string): Promise<string[]> {
  const res = await fetch(`${API}/messaging/templates`, { headers: { authorization: `Bearer ${token}` } });
  expect(res.status).toBe(200);
  return ((await res.json()) as { key: string }[]).map((r) => r.key);
}

/** POST /threads/:phone/template as one user; the status and error code. */
export async function sendAs(input: { token: string; phone: string; key: string }): Promise<{ status: number; code?: string }> {
  const res = await fetch(`${API}/threads/${encodeURIComponent(input.phone)}/template`, {
    method: 'POST',
    headers: { authorization: `Bearer ${input.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ key: input.key, params: { '1': 'أم سارة', '2': 'الأحد' }, clientRequestId: crypto.randomUUID() }),
  });
  const body = (await res.json()) as { code?: string };
  return { status: res.status, ...(body.code ? { code: body.code } : {}) };
}
