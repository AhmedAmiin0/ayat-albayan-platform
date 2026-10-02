import type { TablesInsert, TablesUpdate } from '@ab/db';
import type { MessageStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../common/db/db.module';

/** Who a phone is. Each is matched by phone_e164 (unique on all three tables). */
export interface Contact {
  guardian: { id: string; name: string } | null;
  teacher: { id: string; name: string } | null;
  lead: { id: string; name: string | null; follow_up_stage: number } | null;
}

/** The outbound row a status or a reply refers to (by Meta's wamid). */
export interface OutboundRow {
  id: string;
  status: MessageStatus;
  phone_e164: string;
  lesson_id: string | null;
  template_key: string | null;
  body: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  guardians: { name: string } | null;
  leads: { name: string | null } | null;
}

export interface StatusMove {
  id: string;
  /** Compare-and-set: only when the row still has this status. */
  from: MessageStatus;
  patch: TablesUpdate<'messages'>;
}

function check(error: PostgrestError | null): void {
  if (error) throw new Error(`db: ${error.message}`);
}

/** Thin supabase-js access for the WhatsApp webhook; the rules live in the services. */
@Injectable()
export class WebhookQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

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
