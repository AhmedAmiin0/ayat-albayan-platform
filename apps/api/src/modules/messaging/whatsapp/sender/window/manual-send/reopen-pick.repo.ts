import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { ReopenRow } from '@/modules/messaging/whatsapp/sender/window/reopen-state';

/** A reopen row with what the composer's bar shows: its bubble's id and its template. */
export type ReopenBubble = ReopenRow & {
  id: string;
  template_key: string | null;
  created_by: string | null;
};

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The reopen rows of one phone: `reopen:<E.164>:<day>[:<try>]` (reopenDedupKey). */
const reopenKeys = (phone: string): string => `reopen:${phone}:%`;

/** The read of «إعادة فتح المحادثة» (reopen-pick.ts): one phone's reopen rows since a time. */
@Injectable()
export class ReopenPickRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every reopen row of `phone` created since `since`, newest first. */
  async since(phone: string, since: Date): Promise<ReopenBubble[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(
        'id, template_key, created_by, phone_e164, status, error_code, expires_at, created_at, dedup_key',
      )
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .like('dedup_key', reopenKeys(phone))
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw fail('reopen pick read', error.message);
    return data;
  }
}
