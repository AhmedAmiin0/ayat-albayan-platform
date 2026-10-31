import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { withoutPushToken } from '@/modules/people/me/push/push-tokens';
import { readAll } from '@/common/db/read-all';
import { dbError } from '@/common/http/http';

export interface TicketRow {
  id: string;
  profile_id: string;
  ticket_ids: string[];
  error: string | null;
}

/** push_notifications ↔ Expo receipts (R-MOB-01). ticket_ids = the tickets not checked yet. */
@Injectable()
export class PushReceiptsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Rows sent in [from, to] that still have tickets to check. */
  unchecked(range: { from: Date; to: Date }): Promise<TicketRow[]> {
    return readAll((from, to) =>
      this.db
        .from('push_notifications')
        .select('id, profile_id, ticket_ids, error')
        .gte('sent_at', range.from.toISOString())
        .lte('sent_at', range.to.toISOString())
        .filter('ticket_ids', 'neq', '{}')
        .order('id')
        .range(from, to),
    );
  }

  /** Keeps only the tickets still without a receipt; records the first receipt error. */
  async settle(id: string, values: { ticket_ids: string[]; error: string | null }): Promise<void> {
    const { error } = await this.db.from('push_notifications').update(values).eq('id', id);
    if (error) throw dbError(error);
  }

  /**
   * Drops tokens Expo reported DeviceNotRegistered from the admin's profile.
   * ponytail: read-then-write like PushService.prune; a token registered in between survives
   * unless it is the dead one.
   */
  async prune(profileId: string, dead: readonly string[]): Promise<number> {
    const { data, error } = await this.db.from('profiles').select('push_tokens').eq('id', profileId).maybeSingle();
    if (error) throw dbError(error);
    if (!data) return 0;
    const kept = dead.reduce((tokens, t) => withoutPushToken(tokens, t), data.push_tokens);
    if (kept.length === data.push_tokens.length) return 0;
    const res = await this.db.from('profiles').update({ push_tokens: kept }).eq('id', profileId);
    if (res.error) throw dbError(res.error);
    return data.push_tokens.length - kept.length;
  }
}
