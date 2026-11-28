import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { check } from '@/modules/messaging/inbox/threads/store/check';

const QUOTE_SELECT =
  'id, direction, body, media_mime, template_key, deleted_at, hidden_at, sender:profiles!messages_created_by_fkey(full_name)' as const;

/** The quoted rows of one chat (ThreadQuotes): never another phone's message. */
@Injectable()
export class ThreadQuotesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async replyTarget(phone: string, messageId: string) {
    const { data, error } = await this.db
      .from('messages')
      .select('id, wa_message_id, line, number_id')
      .eq('id', messageId)
      .eq('phone_e164', phone)
      .maybeSingle();
    check(error, 'reply target read');
    return data;
  }

  async quoted(ids: readonly string[], phone: string) {
    const { data, error } = await this.db
      .from('messages')
      .select(QUOTE_SELECT)
      .in('id', [...ids])
      .eq('phone_e164', phone);
    check(error, 'quoted messages read');
    return data;
  }
}
