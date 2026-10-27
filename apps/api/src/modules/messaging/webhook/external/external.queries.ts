import type { TablesInsert } from '@ab/db';
import type { WaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../../../common/db/db.module';
import { SENDING } from '../../whatsapp/sender/send-plan';

function check(error: PostgrestError | null): void {
  if (error) throw new Error(`db: ${error.message}`);
}

/** Where the catch-up looks: the number's rows, else (legacy, no wa_numbers row) the line's. */
interface ExternalScope {
  line: WaLine;
  numberId: string | null;
}

/** Thin supabase-js access for messages sent outside the app (external/); the rules live in the services. */
@Injectable()
export class ExternalQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The wamids of this list we already hold (any direction). */
  async existing(waMessageIds: readonly string[]): Promise<Set<string>> {
    if (waMessageIds.length === 0) return new Set();
    const { data, error } = await this.db.from('messages').select('wa_message_id').in('wa_message_id', [...waMessageIds]);
    check(error);
    return new Set((data ?? []).flatMap((r) => (r.wa_message_id ? [r.wa_message_id] : [])));
  }

  /**
   * True while our sender holds a claimed, unrecorded try for this phone (queued + SENDING): the
   * message Kapso reports may be that very send, whose wamid the sender writes only after Meta
   * answered. Storing it now would take its wamid; the catch-up job's day-long re-read stores it later.
   */
  async inFlight(phone: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .eq('error_code', SENDING)
      .limit(1);
    check(error);
    return (data ?? []).length > 0;
  }

  /** Inserts the row; false when the wamid is already stored (unique wa_message_id: on conflict do nothing). */
  async insert(row: TablesInsert<'messages'>): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'wa_message_id', ignoreDuplicates: true })
      .select('id');
    check(error);
    return (data ?? []).length > 0;
  }

  /**
   * A reply sent outside the app answers the chat (WhatsApp counts it as read on the phone): stamps
   * this phone's unread inbound rows up to the reply (created_at <= upTo) read at `readAt`. Never a
   * newer row; idempotent (read_at null only); no Meta read receipt. Fires migration 860's ping.
   */
  async markAnsweredRead(phone: string, upTo: Date, readAt: Date): Promise<number> {
    const { data, error } = await this.db
      .from('messages')
      .update({ read_at: readAt.toISOString() })
      .eq('phone_e164', phone)
      .eq('direction', 'inbound')
      .is('read_at', null)
      .lte('created_at', upTo.toISOString())
      .select('id');
    check(error);
    return (data ?? []).length;
  }

  /**
   * The newest message sent outside the app on this number: outbound, created_by null, never claimed
   * by the sender (attempts 0, which counts every try of ours) and with a wamid; null when none.
   */
  async newestExternal(scope: ExternalScope): Promise<Date | null> {
    let query = this.db
      .from('messages')
      .select('created_at')
      .eq('direction', 'outbound')
      .is('created_by', null)
      .eq('attempts', 0)
      .not('wa_message_id', 'is', null);
    query = scope.numberId ? query.eq('number_id', scope.numberId) : query.eq('line', scope.line);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    check(error);
    return data ? new Date(data.created_at) : null;
  }
}
