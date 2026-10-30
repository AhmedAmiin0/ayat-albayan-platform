import { expect, type Page } from '@playwright/test';
import { API, bearer } from '../messages';
import { withSql } from '../schedule';
import { stubSent, stubTemplateStatus, type StubSent } from '../wa-stub';

// report_ready and renewal_due start «not_submitted» (migration 141) and the stub starts without
// them (tools/wa-stub defaultTemplates), so nothing can be sent. approveTemplates walks the real
// way: the admin's POST /messaging/templates/:key/submit → Meta (the stub) reviews → approved.
// Call it after stubReset() (which forgets the stub's templates); the returned function puts the
// registry rows back as they were.

interface Saved {
  key: string;
  status: string;
  meta_id: string | null;
  submitted_at: Date | null;
  last_error: string | null;
}

export async function approveTemplates(admin: Page, keys: string[]): Promise<() => Promise<void>> {
  const saved = await withSql((sql) => sql<Saved[]>`
    select key, status, meta_id, submitted_at, last_error from public.message_templates where key in ${sql(keys)}`);
  expect(saved).toHaveLength(keys.length);
  await withSql((sql) => sql`
    update public.message_templates set status = 'not_submitted', meta_id = null, submitted_at = null, last_error = null
    where key in ${sql(keys)}`);
  for (const key of keys) {
    const res = await admin.request.post(`${API}/messaging/templates/${key}/submit`, { headers: await bearer(admin) });
    expect(res.status(), `submit ${key}`).toBe(200);
    await stubTemplateStatus(key, 'APPROVED');
  }
  // The registry learns Meta's verdict from the health check; set directly so the other rows stay.
  await withSql((sql) => sql`
    update public.message_templates set status = 'approved', last_checked_at = now() where key in ${sql(keys)}`);
  return async () => {
    for (const row of saved) {
      await withSql((sql) => sql`
        update public.message_templates set status = ${row.status}::public.template_status, meta_id = ${row.meta_id},
          submitted_at = ${row.submitted_at}, last_error = ${row.last_error} where key = ${row.key}`);
    }
  };
}

/** What the stub got for one guardian (wa_id digits), oldest first. */
export async function sentToDigits(digits: string): Promise<StubSent[]> {
  return (await stubSent()).filter((m) => m.to.replace(/\D/g, '') === digits);
}

/** The document header of a template message: its signed link and the file name. */
export function documentOf(message: StubSent | undefined): { link: string; filename: string } | undefined {
  const body = (message?.body ?? {}) as { template?: { components?: { type: string; parameters?: { document?: { link: string; filename: string } }[] }[] } };
  return body.template?.components?.find((c) => c.type === 'header')?.parameters?.[0]?.document;
}
