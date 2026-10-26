import { withSql } from './schedule';
import type { StubSent } from './wa-stub';

// The outbound queue as the settings switches see it: count, clear and seed queued rows, read what
// happened to a phone's rows, and filter what the wa-stub received.

/** Queued outbound rows right now (what GET /messages/gate counts). */
export async function queuedCount(): Promise<number> {
  return withSql(async (sql) => {
    const [row] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.messages where direction = 'outbound' and status = 'queued'`;
    return row?.n ?? 0;
  });
}

/** Removes queued outbound rows left by other specs, so the queue count is exactly ours. */
export async function clearQueue(): Promise<void> {
  await withSql((sql) => sql`delete from public.messages where direction = 'outbound' and status = 'queued'`);
}

interface QueuedText {
  phone: string;
  leadId: string;
  body: string;
}

/** A queued admin text to a lead (session open): waits while the kill switch is OFF. */
export async function queueText(input: QueuedText): Promise<void> {
  await withSql((sql) => sql`
    insert into public.messages (direction, phone_e164, lead_id, body, status)
    values ('outbound', ${input.phone}, ${input.leadId}, ${input.body}, 'queued')`);
}

/** A job-made renewal reminder (created_by null): automatic, so OFF holds it as auto_off. */
export async function queueRenewal(input: { phone: string; dedupKey: string }): Promise<void> {
  await withSql((sql) => sql`
    insert into public.messages (direction, phone_e164, template_key, template_params, dedup_key, status)
    values ('outbound', ${input.phone}, 'renewal_due', ${sql.json({ '1': 'سارة', '2': 'بقيت حلقتان' })},
      ${input.dedupKey}, 'queued')`);
}

/** Our outbound rows to the phone (the inbound that opens the 24 h window is not counted). */
export async function messageState(phone: string): Promise<{ status: string; error_code: string | null }[]> {
  return withSql((sql) => sql<{ status: string; error_code: string | null }[]>`
    select status, error_code from public.messages where phone_e164 = ${phone} and direction = 'outbound' order by created_at`);
}

export const sentToDigits = (sent: StubSent[], digits: string): StubSent[] =>
  sent.filter((m) => m.to.replace(/\D/g, '') === digits);
