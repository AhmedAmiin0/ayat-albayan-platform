import type { TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../common/db/db.module';
import { SettingsService } from '../../common/settings/settings.service';
import type { Contact, OutboundRow, StatusMove } from './webhook.types';

export type { Contact, OutboundRow, StatusMove } from './webhook.types';

function check(error: PostgrestError | null): void {
  if (error) throw new Error(`db: ${error.message}`);
}

/** Thin supabase-js access for the WhatsApp webhook; the rules live in the services. */
@Injectable()
export class WebhookQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: SettingsService,
  ) {}

  /** settings.quick_reply_window_hours in ms: how far back a typed «نعم» looks for our lesson message. */
  async replyWindowMs(): Promise<number> {
    return (await this.settings.all()).quick_reply_window_hours * 3_600_000;
  }

  async identify(phone: string): Promise<Contact> {
    const [g, t, l] = await Promise.all([
      this.db.from('guardians').select('id, name').eq('phone_e164', phone).maybeSingle(),
      this.db.from('teachers').select('id, name:display_name_ar').eq('phone_e164', phone).maybeSingle(),
      this.db.from('leads').select('id, name, follow_up_stage').eq('phone_e164', phone).maybeSingle(),
    ]);
    [g, t, l].forEach((r) => check(r.error));
    return { guardian: g.data, teacher: t.data, lead: l.data };
  }

  /** Inserts an inbound row; false when Meta re-sent a wamid we already stored (replay). */
  async insertInbound(row: TablesInsert<'messages'>): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'wa_message_id', ignoreDuplicates: true })
      .select('id');
    check(error);
    return (data ?? []).length > 0;
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

  /** Removes an inbound row by wamid (its quick reply failed: Meta's re-send must not be a replay). */
  async deleteInbound(waMessageId: string): Promise<void> {
    const { error } = await this.db.from('messages').delete().eq('wa_message_id', waMessageId).eq('direction', 'inbound');
    check(error);
  }

  async outboundByWaId(waMessageId: string): Promise<OutboundRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .select(
        'id, status, phone_e164, lesson_id, template_key, body, sent_at, delivered_at, read_at, guardians(name), leads(name)',
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
   * docs/12 §3.5: the lesson of the latest outbound row with a lesson_id we sent this phone since
   * `since` (48 h), while that lesson is still open (scheduled | confirmed). Only rows that actually
   * went out: a reply can't answer a message still in the queue. null otherwise.
   */
  async recentLessonOutbound(input: { phone: string; since: Date }): Promise<string | null> {
    const { data, error } = await this.db
      .from('messages')
      .select('lesson_id, lesson:lessons!inner(status)')
      .eq('direction', 'outbound')
      .eq('phone_e164', input.phone)
      .in('status', ['sent', 'delivered', 'read', 'sent_manually'])
      .gt('created_at', input.since.toISOString())
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
}
