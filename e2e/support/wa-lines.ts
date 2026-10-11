import type { WaLine } from '@ab/shared';
import { withSql } from './schedule';
import { stub, stubSent, type StubSent } from './wa-stub';

// Two WhatsApp lines in e2e (docs/12 §13.12): the stub runs both numbers (playwright.config.ts
// E2E_WA / E2E_WA_CHAT), records which phone-number id every send and read used, and signs each
// line's webhooks with that line's own app secret.

/** = playwright.config.ts E2E_WA.WA_PHONE_NUMBER_ID / E2E_WA_CHAT_KEYS.WA_CHAT_PHONE_NUMBER_ID. */
export const NOTIF_PN = 'e2e-phone';
export const CHAT_PN = 'e2e-chat-phone';
export const LINE_PN: Record<WaLine, string> = { notifications: NOTIF_PN, chat: CHAT_PN };
/** E2E_LINES=single (playwright.config.ts): no chat line configured, so two-line specs skip. */
export const SINGLE_LINE = process.env['E2E_LINES'] === 'single';

export interface LineInbound {
  from: string;
  name?: string;
  text?: string;
  /** Template quick-reply tap (Meta type «button»): a guardian answering a reminder. */
  button?: { text: string; payload: string };
  /** Unix seconds (Meta's timestamp, stored as created_at); defaults to now. */
  timestamp?: number;
  /** Overrides the line's phone-number id (an id that is neither line). */
  phoneNumberId?: string;
  /** Signs with this secret instead of the line's own (the API must answer 401). */
  signWith?: string;
}

/** A guardian / lead writes to one of the two numbers; `status` is the API webhook's answer. */
export const stubInboundOn = (line: WaLine, spec: LineInbound) =>
  stub<{ id: string; status: number }>('/__stub/inbound', { phoneNumberId: LINE_PN[line], ...spec });

/** What «Meta» accepted on one phone-number id since the last reset. */
export async function sentVia(pn: string): Promise<StubSent[]> {
  return (await stubSent()).filter((m) => m.phoneNumberId === pn);
}

export interface StubReadMark {
  phoneNumberId: string;
  messageId: string;
}

/** Read receipts with the phone-number id each was sent through. */
export const stubReadsByLine = () => stub<StubReadMark[]>('/__stub/reads/by-line');

export interface LineHealthPatch {
  subscribed?: boolean;
  status?: string;
  quality_rating?: string;
  name_status?: string;
  code_verification_status?: string;
  override_callback_uri?: string;
}

/** Plays an unhealthy / unsubscribed number for the diagnostics; /__stub/reset restores it. */
export const stubLineHealth = (pn: string, patch: LineHealthPatch) => stub<unknown>(`/__stub/lines/${pn}`, patch);

export interface QueuedTemplate {
  phone: string;
  /** An approved registry key whose stub template has exactly the two body params below. */
  key?: string;
  /** The admin (or other profile) that queued it: a non-automatic row the sender always sends. */
  createdBy: string;
}

/** A queued template row (no line written: the sender stamps it at claim, docs/12 §13.2). */
export async function queueTemplate(input: QueuedTemplate): Promise<void> {
  await withSql((sql) => sql`
    insert into public.messages (direction, phone_e164, template_key, template_params, status, created_by, dedup_key)
    values ('outbound', ${input.phone}, ${input.key ?? 'booking_confirmation_plain'},
      ${sql.json({ '1': 'سارة', '2': 'الأحد 17:00' })}, 'queued', ${input.createdBy},
      ${`e2e:wa-lines:${input.phone}:${Date.now()}`})`);
}

export interface LineRow {
  direction: string;
  line: WaLine | null;
  template_key: string | null;
  body: string | null;
  status: string;
  wa_message_id: string | null;
}

/** Every message row of an E.164 phone with its line, oldest first. */
export async function messagesWithLine(phone: string): Promise<LineRow[]> {
  return withSql((sql) => sql<LineRow[]>`
    select direction, line, template_key, body, status, wa_message_id
    from public.messages where phone_e164 = ${phone} order by created_at, id`);
}

/** The id of the seeded e2e profile of a role (created_by of an admin-queued row). */
export async function profileIdOf(role: string): Promise<string> {
  const [row] = await withSql((sql) => sql<{ id: string }[]>`
    select id from public.profiles where role = ${role}::public.user_role order by created_at limit 1`);
  if (!row) throw new Error(`no ${role} profile`);
  return row.id;
}
