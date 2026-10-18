import { expect } from '@playwright/test';
import { API } from './messages';
import { withSql } from './schedule';
import { stubTemplateStatus } from './wa-stub';

// trial_reschedule (owner 2026-10-18), seeded by migration 460 on the chat line, not submitted, on the
// allow-list. Only the admin's explicit submit sends it to the chat number's WABA; the stub then plays
// Meta's approval on THAT WABA only (playwright.config.ts WA_CHAT_WABA_ID).

export const RESCHEDULE = 'trial_reschedule';
export const CHAT_WABA = 'e2e-chat-waba';
const BODY = 'السلام عليكم {{1}}،\nنودّ إعادة جدولة موعد الحلقة التجريبية.\nما الوقت الذي يناسبكم؟';

/** The row exactly as migration 460 seeds it (a previous spec may have submitted, moved or dropped it). */
export async function seedReschedule(): Promise<void> {
  await withSql((sql) => sql`
    insert into public.message_templates (key, meta_name, language, category, body_ar, params, status, line, sales_starter)
    values (${RESCHEDULE}, ${RESCHEDULE}, 'ar', 'utility', ${BODY}, ${sql.json(['contact_name'])}, 'not_submitted', 'chat', true)
    on conflict (key) do update set status = 'not_submitted', line = 'chat', sales_starter = true, meta_id = null,
      quality = null, last_error = null, submitted_at = null, last_checked_at = null, body_ar = excluded.body_ar`);
}

/** The registry row's line, status and Meta id. */
export async function rescheduleRow(): Promise<{ line: string; status: string; meta_id: string | null }> {
  return withSql(async (sql) => {
    const [row] = await sql<{ line: string; status: string; meta_id: string | null }[]>`
      select line, status, meta_id from public.message_templates where key = ${RESCHEDULE}`;
    if (!row) throw new Error('trial_reschedule missing');
    return row;
  });
}

async function adminCall(token: string, input: { method: string; path: string; body?: unknown }): Promise<Response> {
  return fetch(`${API}${input.path}`, {
    method: input.method,
    // No content-type without a body: Fastify refuses an empty JSON body.
    ...(input.body === undefined
      ? { headers: { authorization: `Bearer ${token}` } }
      : { headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(input.body) }),
  });
}

/** Admin API: submit to the chat number, the stub approves it on the chat WABA, the chat number syncs. */
export async function approveReschedule(adminToken: string): Promise<void> {
  await seedReschedule();
  expect((await adminCall(adminToken, { method: 'POST', path: `/messaging/templates/${RESCHEDULE}/submit` })).status).toBe(200);
  await stubTemplateStatus(RESCHEDULE, 'APPROVED', CHAT_WABA);
  const sync = await adminCall(adminToken, { method: 'POST', path: '/messaging/templates/health', body: { line: 'chat' } });
  expect(sync.status).toBe(200);
  expect((await rescheduleRow()).status).toBe('approved');
}
