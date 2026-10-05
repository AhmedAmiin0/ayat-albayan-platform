import { withSql } from './schedule';
import { STUB_URL, type StubSent } from './wa-stub';

// A6 helpers: put settings and the template registry back after a spec changed them, and read
// what the wa-stub holds as «Meta's» templates. resetDb keeps message_templates, so a spec that
// moves a status (health check, submit) must restore it itself.

/** The settings rows for `keys` as they are now (a missing key is absent from the list). */
export async function snapshotSettings(keys: string[]): Promise<{ key: string; value: unknown }[]> {
  return withSql((sql) => sql<{ key: string; value: unknown }[]>`
    select key, value from public.settings where key = any(${keys})`);
}

/** Writes the snapshot back; a key that had no row gets its row deleted again. */
export async function restoreSettings(input: { keys: string[]; rows: { key: string; value: unknown }[] }): Promise<void> {
  await withSql(async (sql) => {
    for (const key of input.keys) {
      const row = input.rows.find((r) => r.key === key);
      if (row) {
        // JSON text + ::jsonb, not sql.json(): a JSON null (late_cancel_hours OFF) must stay jsonb null.
        await sql`insert into public.settings (key, value) values (${key}, ${JSON.stringify(row.value)}::jsonb)
          on conflict (key) do update set value = excluded.value`;
      } else {
        await sql`delete from public.settings where key = ${key}`;
      }
    }
  });
}

/** One settings value as text (jsonb scalar, or the array as JSON); null when there is no row. */
export async function settingText(key: string): Promise<string | null> {
  return withSql(async (sql) => {
    const [row] = await sql<{ v: string | null }[]>`
      select value #>> '{}' as v from public.settings where key = ${key}`;
    return row?.v ?? null;
  });
}

export interface TemplateRow {
  key: string;
  status: string;
  quality: string | null;
  meta_id: string | null;
  last_checked_at: Date | null;
  last_error: string | null;
  submitted_at: Date | null;
  body_ar: string;
  footer_ar: string | null;
  buttons: unknown;
}

/** Every registry column a health check or a submit rewrites. */
export async function snapshotTemplates(): Promise<TemplateRow[]> {
  return withSql((sql) => sql<TemplateRow[]>`
    select key, status, quality, meta_id, last_checked_at, last_error, submitted_at, body_ar,
      footer_ar, buttons from public.message_templates`);
}

export async function restoreTemplates(rows: TemplateRow[]): Promise<void> {
  await withSql(async (sql) => {
    for (const r of rows) {
      await sql`update public.message_templates set status = ${r.status}::public.template_status,
        quality = ${r.quality}, meta_id = ${r.meta_id}, last_checked_at = ${r.last_checked_at},
        last_error = ${r.last_error}, submitted_at = ${r.submitted_at}, body_ar = ${r.body_ar},
        footer_ar = ${r.footer_ar}, buttons = ${sql.json(r.buttons as never)}
        where key = ${r.key}`;
    }
  });
}

/** Forces a registry row's status (e.g. «approved» for a template the stub does not have). */
export async function setTemplateStatus(input: { key: string; status: string }): Promise<void> {
  await withSql((sql) => sql`
    update public.message_templates set status = ${input.status}::public.template_status
    where key = ${input.key}`);
}

export async function templateRow(key: string): Promise<{ status: string; last_checked_at: Date | null; submitted_at: Date | null }> {
  return withSql(async (sql) => {
    const [row] = await sql<{ status: string; last_checked_at: Date | null; submitted_at: Date | null }[]>`
      select status, last_checked_at, submitted_at from public.message_templates where key = ${key}`;
    if (!row) throw new Error(`template ${key} missing`);
    return row;
  });
}

export interface StubTemplateView {
  name: string;
  status: string;
  components: { type: string; format?: string; example?: { header_handle?: string[] } }[];
}

/** GET /__stub/templates: what «Meta» holds (the stub's registry). */
export async function stubTemplates(): Promise<StubTemplateView[]> {
  const res = await fetch(`${STUB_URL}/__stub/templates`);
  if (!res.ok) throw new Error(`wa-stub templates: ${res.status}`);
  return (await res.json()) as StubTemplateView[];
}

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

export interface QueuedText {
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
