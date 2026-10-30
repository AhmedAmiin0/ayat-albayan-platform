import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { withSql } from '../schedule';
import { STUB_URL } from '../wa-stub';

// Inbox edge-path helpers (A4/A5): media inbound and one-shot send failures on tools/wa-stub,
// message/push rows read straight from the DB, and opening a thread by its contact name.

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${STUB_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`wa-stub ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

interface StubMedia {
  kind: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  mime: string;
  caption?: string;
  filename?: string;
  base64?: string;
}

/** A guardian / lead sends a photo or a file (tools/wa-stub InboundSpec.media). */
export const stubInboundMedia = (spec: { from: string; name?: string; media: StubMedia }) =>
  post<{ id: string; status: number; mediaId: string | null }>('/__stub/inbound', spec);

/** The NEXT send to `to` (wa_id digits) fails with Meta error `code`; one shot. */
export const stubFail = (spec: { to: string; code: number }) => post<{ armed: boolean }>('/__stub/fail', spec);

/** Moves every inbound message of a phone (E.164) back in time: the 24 h window closes. */
export async function backdateInbound(input: { phone: string; hoursAgo: number }): Promise<void> {
  await withSql((sql) => sql`
    update public.messages set created_at = now() - make_interval(hours => ${input.hoursAgo})
    where phone_e164 = ${input.phone} and direction = 'inbound'`);
}

interface InboundRow {
  media_mime: string | null;
  body: string | null;
}

/** Inbound rows of a phone (E.164), oldest first. */
export async function inboundRows(phone: string): Promise<InboundRow[]> {
  return withSql((sql) => sql<InboundRow[]>`
    select media_mime, body from public.messages
    where phone_e164 = ${phone} and direction = 'inbound' order by created_at`);
}

export interface OutboundRow {
  id: string;
  status: string;
  error_code: string | null;
  created_by: string | null;
  dedup_key: string | null;
  wa_message_id: string | null;
  read_at: Date | null;
  sent_manually_at: Date | null;
  template_key: string | null;
  body: string | null;
  attempts: number;
}

/** Outbound rows of a phone (E.164), oldest first, with the delivery columns. */
export async function outboundRows(phone: string): Promise<OutboundRow[]> {
  return withSql((sql) => sql<OutboundRow[]>`
    select id, status, error_code, created_by, dedup_key, wa_message_id, read_at, sent_manually_at,
      template_key, body, attempts
    from public.messages where phone_e164 = ${phone} and direction = 'outbound' order by created_at`);
}

/** The last outbound row of a phone (throws when there is none yet, so a poll keeps waiting). */
export async function lastOutbound(phone: string): Promise<OutboundRow> {
  const row = (await outboundRows(phone)).at(-1);
  if (!row) throw new Error(`no outbound row for ${phone}`);
  return row;
}

/** The role of the profile that wrote a row (created_by). */
export async function roleOf(profileId: string | null): Promise<string | null> {
  if (!profileId) return null;
  const [row] = await withSql((sql) => sql<{ role: string }[]>`select role from public.profiles where id = ${profileId}`);
  return row?.role ?? null;
}

/** Admin push rows (push_notifications) of a kind whose data names this message id. */
export async function pushesForMessage(input: { messageId: string; kind: string }): Promise<number> {
  const [row] = await withSql((sql) => sql<{ n: number }[]>`
    select count(*)::int as n from public.push_notifications
    where kind = ${input.kind}::public.push_kind and data->>'messageId' = ${input.messageId}`);
  return row?.n ?? 0;
}

/** Admin push rows of a kind for a phone (E.164): new_message / new_lead carry data.phone. */
export async function pushesForPhone(input: { phone: string; kind: string }): Promise<number> {
  const [row] = await withSql((sql) => sql<{ n: number }[]>`
    select count(*)::int as n from public.push_notifications
    where kind = ${input.kind}::public.push_kind and data->>'phone' = ${input.phone}`);
  return row?.n ?? 0;
}

/** One profile's push rows (the bell) of a kind for a phone (E.164): who was alerted (docs/21 D3). */
export async function pushesForProfile(input: { profileId: string; kind: string; phone: string }): Promise<number> {
  const [row] = await withSql((sql) => sql<{ n: number }[]>`
    select count(*)::int as n from public.push_notifications
    where profile_id = ${input.profileId} and kind = ${input.kind}::public.push_kind and data->>'phone' = ${input.phone}`);
  return row?.n ?? 0;
}

/** Opens a thread from the inbox list by the contact's name; returns the message log. */
export async function openThread(page: Page, name: string): Promise<Locator> {
  await page.goto('/admin/inbox');
  await page.getByRole('link', { name: ar.inbox.openThread.replace('{name}', name) }).click({ timeout: 30_000 });
  const log = page.getByRole('log', { name: ar.messages.log });
  await expect(log).toBeVisible();
  return log;
}

/** The bubble (article) that contains `text`. */
export const bubble = (log: Locator, text: string): Locator => log.getByRole('article').filter({ hasText: text });
