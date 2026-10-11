import { createClient } from '@supabase/supabase-js';
import type { APIRequestContext } from '@playwright/test';
import { seedUser } from './db';
import { nextWeekSaturday, withSql } from './schedule';

// Helpers of the assistant API specs (real API on :3100, real database): logins, a typed call wrapper,
// leads of an assistant, and the sales booking body. Nothing here is mocked.

export const API = 'http://localhost:3100';
export const TAG = String(Date.now()).slice(-6);
const PASSWORD = 'Assistant-e2e-123';

export async function tokenOf(email: string, password: string): Promise<string> {
  const url = process.env['SUPABASE_URL'] ?? '';
  const client = createClient(url, process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '', { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error('no session');
  return data.session.access_token;
}

export interface Reply<T = Record<string, unknown>> {
  status: number;
  body: T;
}

/** One call as `token` (null: no login): the status and the JSON body (null for an empty one). */
export async function call<T = Record<string, unknown>>(
  request: APIRequestContext,
  who: { token: string | null; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; body?: object },
): Promise<Reply<T>> {
  const headers: Record<string, string> = who.token ? { authorization: `Bearer ${who.token}` } : {};
  const res = await request.fetch(`${API}${who.path}`, { method: who.method, headers, data: who.body });
  const text = await res.text();
  return { status: res.status(), body: (text ? JSON.parse(text) : null) as T };
}

export interface Assistant {
  id: string;
  token: string;
  email: string;
}

/** A sales login (the «المبيعات» base role) with a real session. */
export async function makeAssistant(tag: string): Promise<Assistant> {
  const email = `${tag}-${TAG}@e2e.local`;
  const id = await seedUser({ email, password: PASSWORD, role: 'sales', fullName: `مسؤولة مبيعات ${tag}` });
  return { id, email, token: await tokenOf(email, PASSWORD) };
}

let phones = 0;
/** A fresh Saudi mobile per call. */
export const freshPhone = (): string => `+9665${String(Date.now()).slice(-6)}${String(++phones % 100).padStart(2, '0')}`;

/** A lead assigned to the assistant: the chat she registers a new family from. */
export async function leadOf(assistantId: string, phone: string): Promise<string> {
  return withSql(async (sql) => {
    const [row] = await sql<{ id: string }[]>`insert into public.leads (phone_e164, name, status, source, assigned_to, last_inbound_at)
      values (${phone}, 'ولي أمر محتمل', 'new', 'whatsapp_direct', ${assistantId}, now()) returning id`;
    if (!row) throw new Error('lead not written');
    return row.id;
  });
}

/** POST /sales/booking: a new family and a free trial, from her lead, at `time` (Riyadh) next Saturday. */
export function trialBody(input: { teacherId: string; leadId: string; phone: string; name: string; time: string }): object {
  return {
    teacherId: input.teacherId,
    byday: [6],
    startTimeLocal: input.time,
    tz: 'Asia/Riyadh',
    durationMin: 30,
    startsOn: nextWeekSaturday(),
    package: 'trial',
    leadId: input.leadId,
    newStudent: { name: input.name, tz: 'Asia/Riyadh' },
    guardian: { name: `أم ${input.name}`, phone_e164: input.phone, country: 'SA', tz: 'Asia/Riyadh' },
  };
}

/** The statement month (YYYY-MM) of now in the assistants' zone, Asia/Riyadh. */
export const thisMonth = (): string => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 7);
export const dayOffset = (days: number): string => new Date(Date.now() + 3 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

export interface Family {
  student: string;
  guardian: string;
  phone: string;
}

/** A guardian with one child, brought by the assistant (null: by nobody). Written with SQL: this is test data, not the flow under test. */
export async function family(broughtBy: string | null, name: string): Promise<Family> {
  const phone = freshPhone();
  return withSql(async (sql) => {
    const [g] = await sql<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz)
      values (${`أم ${name}`}, ${phone}, 'SA', 'Asia/Riyadh') returning id`;
    const [s] = await sql<{ id: string }[]>`insert into public.students (guardian_id, name, name_normalized, tz, brought_by)
      values (${g?.id ?? ''}, ${name}, ${name}, 'Asia/Riyadh', ${broughtBy}) returning id`;
    if (!g || !s) throw new Error('family not written');
    return { student: s.id, guardian: g.id, phone };
  });
}

/** A payment keyed in by `by` (payments.recorded_by): an assistant has no route to record one, so SQL does. */
export async function paymentBy(subscriptionId: string, by: string, amount: number): Promise<void> {
  await withSql((sql) => sql`insert into public.payments (subscription_id, amount, currency, method, paid_at, kind, recorded_by)
    values (${subscriptionId}, ${amount}, (select currency from public.subscriptions where id = ${subscriptionId}), 'bank', now(), 'payment', ${by})`);
}

/** A chat message of a number (guardian_id links it to the family); a template key makes it a template send. */
export async function message(input: { phone: string; guardian: string; direction: 'inbound' | 'outbound'; body: string; template?: string }): Promise<void> {
  await withSql(async (sql) => {
    const { direction: d, phone, guardian, body, template } = input;
    if (d === 'inbound') await sql`insert into public.messages (direction, phone_e164, guardian_id, body) values ('inbound', ${phone}, ${guardian}, ${body})`;
    else await sql`insert into public.messages (direction, phone_e164, guardian_id, body, template_key, status) values ('outbound', ${phone}, ${guardian}, ${body}, ${template ?? null}, 'sent')`;
  });
}
