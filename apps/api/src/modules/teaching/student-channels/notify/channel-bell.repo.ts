import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { done } from '@/common/db/errors';

/**
 * The bell rows of one channel message (push_notifications kind channel_message, dedup key
 * channel_message:{message_id}:{profile_id}, PushService), found by that key's prefix
 * (push_notifications_channel_subject_idx, migration 20261117090300).
 */
@Injectable()
export class ChannelBellRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every recipient's row of this message gets this body (an edit's new text, a deletion). */
  async rewrite(input: { messageId: string; body: string }): Promise<void> {
    done(await this.db
      .from('push_notifications')
      .update({ body: input.body })
      .eq('kind', 'channel_message')
      .like('dedup_key', `channel_message:${input.messageId}:%`));
  }
}
