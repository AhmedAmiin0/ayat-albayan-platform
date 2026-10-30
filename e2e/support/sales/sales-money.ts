import { normalizeArabic } from '@ab/shared';
import type { APIRequestContext } from '@playwright/test';
import { call } from './assistant-api';
import { withSql } from '../schedule';

// Helpers of the sales subscribe spec (owner 2026-10-12, docs/16 rows 16–19): a trial family brought by a
// salesperson on a given WhatsApp number, and the receipt upload to the signed URL. Real API and database.

/** A 1×1 PNG made in memory (no binary fixtures in the repo). */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** A Saudi guardian on `phone` with one child in trial, brought by the salesperson (test data, written with SQL). */
export async function trialFamily(input: { broughtBy: string; phone: string; name: string }): Promise<string> {
  return withSql(async (sql) => {
    const [g] = await sql<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
      values (${`أم ${input.name}`}, ${input.phone}, 'SA', 'Asia/Riyadh') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, brought_by, status)
      values (${g?.id ?? ''}, ${input.name}, ${normalizeArabic(input.name)}, 'Asia/Riyadh', ${input.broughtBy}, 'trial') returning id`;
    if (!s) throw new Error('family not written');
    return s.id;
  });
}

/** POST /sales/payments/receipt-upload-url then PUT the PNG to the signed URL: the receipt path. */
export async function uploadReceipt(request: APIRequestContext, input: { token: string; subscriptionId: string }): Promise<string> {
  const body = { subscriptionId: input.subscriptionId, mime: 'image/png', size: PNG.byteLength };
  const signed = await call<{ path: string; signed_url: string }>(request, { token: input.token, method: 'POST', path: '/sales/payments/receipt-upload-url', body });
  if (signed.status !== 200) throw new Error(`upload url ${signed.status} ${JSON.stringify(signed.body)}`);
  const put = await request.fetch(signed.body.signed_url, { method: 'PUT', data: PNG, headers: { 'content-type': 'image/png' } });
  if (!put.ok()) throw new Error(`receipt upload ${put.status()}`);
  return signed.body.path;
}

/** students.status, and whether an audit row records its trial → active flip by `actor`. */
export async function statusFacts(studentId: string, actor: string): Promise<{ status: string | undefined; audited: boolean }> {
  return withSql(async (sql) => {
    const [s] = await sql<{ status: string }[]>`select status from public.students where id = ${studentId}`;
    const rows = await sql<{ id: string }[]>`select id from public.audit_log where entity = 'students' and entity_id = ${studentId}
      and action = 'status_change' and actor_id = ${actor} and after->>'status' = 'active'`;
    return { status: s?.status, audited: rows.length === 1 };
  });
}
