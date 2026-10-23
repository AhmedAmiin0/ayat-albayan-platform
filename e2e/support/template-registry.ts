import { withSql } from './schedule';
import { STUB_URL } from './wa-stub';

// A6 helpers: put the template registry back after a spec changed it, and read what the wa-stub
// holds as «Meta's» templates. resetDb keeps message_templates, so a spec that moves a status
// (health check, submit) must restore it itself.

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
