import type { TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../../common/db/db.module';
import { familyOfPhone } from '../../../common/db/family-of-phone';
import { guardianOwnerIds } from '../../sales/sales/sales-ownership';
import { refillUnsupported } from './inbound/inbound-refill';
import { WebhookSettings } from './webhook.settings';
import type { Contact, OutboundRow, ReplyWindow, StatusMove } from './webhook.types';

export type { Contact, OutboundRow, StatusMove } from './webhook.types';

function check(error: PostgrestError | null): void {
  if (error) throw new Error(`db: ${error.message}`);
}

/** Thin supabase-js access for the WhatsApp webhook; the rules live in the services. */
@Injectable()
export class WebhookQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: WebhookSettings,
  ) {}

  /** settings.quick_reply_window_hours in ms: how far back a typed «نعم» looks for our lesson message. */
  async replyWindowMs(): Promise<number> {
    return (await this.settings.read()).quick_reply_window_hours * 3_600_000;
  }

  async identify(phone: string): Promise<Contact> {
    const [g, t, l] = await Promise.all([
      familyOfPhone(this.db, phone),
      this.db.from('teachers').select('id, name:display_name_ar').eq('phone_e164', phone).maybeSingle(),
      this.db.from('leads').select('id, name, follow_up_stage').eq('phone_e164', phone).maybeSingle(),
    ]);
    [t, l].forEach((r) => check(r.error));
    return { guardian: g && { id: g.id, name: g.name }, teacher: t.data, lead: l.data };
  }

  /**
   * Inserts an inbound row; false when Meta re-sent a wamid we already stored (replay). A replay
   * with content fills a stored `unsupported` row in place (refillUnsupported), still false.
   */
  async insertInbound(row: TablesInsert<'messages'>): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'wa_message_id', ignoreDuplicates: true })
      .select('id');
    check(error);
    if ((data ?? []).length > 0) return true;
    await refillUnsupported(this.db, row);
    return false;
  }

  /** The latest message time on this phone within the whole second of `at` (orderedAt), or null. */
  async latestInSecond(phone: string, at: Date): Promise<Date | null> {
    const from = Math.floor(at.getTime() / 1000) * 1000;
    const { data, error } = await this.db
      .from('messages')
      .select('created_at')
      .eq('phone_e164', phone)
      .gte('created_at', new Date(from).toISOString())
      .lt('created_at', new Date(from + 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    check(error);
    return data ? new Date(data.created_at) : null;
  }

  /** The wa_numbers row Meta names by this phone_number_id (as the chat import stamps it); null when none. */
  async numberIdFor(phoneNumberId: string): Promise<string | null> {
    const { data, error } = await this.db.from('wa_numbers').select('id').eq('phone_number_id', phoneNumberId).maybeSingle();
    check(error);
    return data?.id ?? null;
  }

  /** Removes an inbound row by wamid (its quick reply failed: Meta's re-send must not be a replay). */
  async deleteInbound(waMessageId: string): Promise<void> {
    const { error } = await this.db.from('messages').delete().eq('wa_message_id', waMessageId).eq('direction', 'inbound');
    check(error);
  }

  async outboundByWaId(waMessageId: string): Promise<OutboundRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .select(
        'id, status, phone_e164, lesson_id, template_key, body, sent_at, delivered_at, read_at, attempts, guardians(name), leads(name)',
      )
      .eq('wa_message_id', waMessageId)
      .eq('direction', 'outbound')
      .maybeSingle();
    check(error);
    return data;
  }

  /** Compare-and-set on status, so two statuses racing never move a row backwards. */
  async moveStatus({ id, from, patch }: StatusMove): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .update(patch)
      .eq('id', id)
      .eq('status', from)
      .select('id');
    check(error);
    return (data ?? []).length > 0;
  }

  /** The lesson exists and one of its students is this guardian's child (a payload is not trusted). */
  async guardianLesson(input: { lessonId: string; guardianId: string }): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select('lesson_id, student:students!inner(guardian_id)')
      .eq('lesson_id', input.lessonId)
      .eq('student.guardian_id', input.guardianId)
      .limit(1);
    check(error);
    return (data ?? []).length > 0;
  }

  /**
   * docs/12 §3.5: the open lesson of the latest sent outbound row with a lesson_id, from `since`
   * (48 h) up to `until` (the reply: never a later message, e.g. a back-filled «نعم»); else null.
   */
  async recentLessonOutbound(input: ReplyWindow): Promise<string | null> {
    const { data, error } = await this.db
      .from('messages')
      .select('lesson_id, lesson:lessons!inner(status)')
      .eq('direction', 'outbound')
      .eq('phone_e164', input.phone)
      .in('status', ['sent', 'delivered', 'read', 'sent_manually'])
      .gt('created_at', input.since.toISOString())
      .lte('created_at', input.until.toISOString())
      .in('lesson.status', ['scheduled', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(1);
    check(error);
    return data?.[0]?.lesson_id ?? null;
  }

  async updateLead(id: string, patch: TablesUpdate<'leads'>): Promise<void> {
    const { error } = await this.db.from('leads').update(patch).eq('id', id);
    check(error);
  }

  /** The assistants who own this family (docs/21 §6). */
  guardianOwners(guardianId: string): Promise<string[]> {
    return guardianOwnerIds(this.db, guardianId);
  }
}
