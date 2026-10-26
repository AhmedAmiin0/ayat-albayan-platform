import { withSql } from './schedule';

// DB reads/seeds for the inbound-WhatsApp specs (R-MSG-04, R-LEAD-01, R-SCH-03). The webhook
// stores async after the stub's POST, so every read here is meant to be polled.

export interface LeadView {
  id: string;
  name: string | null;
  status: string;
  follow_up_paused: boolean;
  follow_up_paused_by: string | null;
}

export async function leadsByPhone(phone: string): Promise<LeadView[]> {
  return withSql((sql) => sql<LeadView[]>`
    select id, name, status, follow_up_paused, follow_up_paused_by
    from public.leads where phone_e164 = ${phone}`);
}

export interface InboundRow {
  body: string | null;
  status: string;
  lead_id: string | null;
  guardian_id: string | null;
  lesson_id: string | null;
  wa_message_id: string | null;
  reply_to_wa_id: string | null;
  interactive_payload: unknown;
  read_at: Date | null;
}

export async function inboundFor(phone: string): Promise<InboundRow[]> {
  return withSql((sql) => sql<InboundRow[]>`
    select body, status, lead_id, guardian_id, lesson_id, wa_message_id, reply_to_wa_id,
      interactive_payload, read_at
    from public.messages where phone_e164 = ${phone} and direction = 'inbound' order by created_at`);
}

export async function guardianPhone(guardianId: string): Promise<string> {
  return withSql(async (sql) => {
    const [row] = await sql<{ phone_e164: string }[]>`
      select phone_e164 from public.guardians where id = ${guardianId}`;
    if (!row) throw new Error('guardian missing');
    return row.phone_e164;
  });
}

export async function guardianName(guardianId: string): Promise<string> {
  return withSql(async (sql) => {
    const [row] = await sql<{ name: string }[]>`select name from public.guardians where id = ${guardianId}`;
    if (!row) throw new Error('guardian missing');
    return row.name;
  });
}

export interface LessonView {
  status: string;
  confirmed_by: string | null;
  confirmed_at: Date | null;
}

export async function lessonView(lessonId: string): Promise<LessonView> {
  return withSql(async (sql) => {
    const [row] = await sql<LessonView[]>`
      select status, confirmed_by, confirmed_at from public.lessons where id = ${lessonId}`;
    if (!row) throw new Error('lesson missing');
    return row;
  });
}

interface OutboundSeed {
  phone: string;
  guardianId: string;
  lessonId: string;
  waId: string;
}

/** A booking confirmation that already went out (status sent), carrying its wamid and lesson. */
export async function seedSentConfirmation(input: OutboundSeed): Promise<void> {
  await withSql((sql) => sql`
    insert into public.messages (direction, phone_e164, guardian_id, lesson_id, template_key,
      template_params, wa_message_id, status, sent_at)
    values ('outbound', ${input.phone}, ${input.guardianId}, ${input.lessonId}, 'booking_confirmation',
      ${sql.json({ '1': 'سارة', '2': 'الأحد 17:00' })}, ${input.waId}, 'sent', now())`);
}

export async function auditActions(entityId: string): Promise<string[]> {
  return withSql(async (sql) => {
    const rows = await sql<{ action: string }[]>`
      select action from public.audit_log where entity_id = ${entityId} order by at`;
    return rows.map((r) => r.action);
  });
}

interface PushView {
  kind: string;
  title: string;
  body: string;
  dedup_key: string;
}

/** Admin push rows whose dedup key starts with `kind:prefix` (one row per admin profile). */
export async function pushesLike(input: { kind: string; prefix: string }): Promise<PushView[]> {
  return withSql((sql) => sql<PushView[]>`
    select kind, title, body, dedup_key from public.push_notifications
    where kind = ${input.kind}::public.push_kind and dedup_key like ${`${input.kind}:${input.prefix}%`}`);
}
