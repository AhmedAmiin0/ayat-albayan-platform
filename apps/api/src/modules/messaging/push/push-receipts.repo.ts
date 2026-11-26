import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { readAll } from '@/common/db/read-all';
import { done, pgError } from '@/common/db/errors';

/**
 * A push_notifications row with tickets left to check. ticket_tokens reads as {} on rows the
 * previous API wrote and on anything malformed: those prune only what a receipt itself names.
 */
const ticketRowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  ticket_ids: z.array(z.string()),
  ticket_tokens: z.record(z.string(), z.string()).catch({}),
  error: z.string().nullable(),
  created_at: z.string(),
});
export type TicketRow = z.infer<typeof ticketRowSchema>;

type Settled = Pick<TicketRow, 'ticket_ids' | 'ticket_tokens' | 'error'>;
type Sent = Pick<TicketRow, 'profile_id' | 'created_at'>;

/** push_notifications ↔ Expo receipts (R-MOB-01). ticket_ids = the tickets not checked yet. */
@Injectable()
export class PushReceiptsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Rows sent in [from, to] that still have tickets to check. */
  async unchecked(range: { from: Date; to: Date }): Promise<TicketRow[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('push_notifications')
        .select('id, profile_id, ticket_ids, ticket_tokens, error, created_at')
        .gte('sent_at', range.from.toISOString())
        .lte('sent_at', range.to.toISOString())
        .filter('ticket_ids', 'neq', '{}')
        .order('id')
        .range(from, to),
    );
    return rows.map((row) => ticketRowSchema.parse(row));
  }

  /** Keeps only the tickets still without a receipt (and their tokens); records the first error. */
  async settle(id: string, values: Settled): Promise<void> {
    done(await this.db.from('push_notifications').update(values).eq('id', id));
  }

  /**
   * Deletes the session bindings of the tokens Expo reported DeviceNotRegistered, like the ticket
   * path (expoDeliver): migration 700's release trigger takes each token off the profile. Only this
   * row's profile (a phone handed on since keeps its new owner) and only bindings made before the
   * row: a device that registered the token since (claim_push_device renews created_at, migration
   * 20261122000200) is live again. Returns the tokens deleted.
   */
  async prune(row: Sent, dead: readonly string[]): Promise<string[]> {
    const { data, error } = await this.db
      .from('push_device_sessions')
      .delete()
      .eq('profile_id', row.profile_id)
      .in('token', dead)
      .lte('created_at', row.created_at)
      .select('token');
    if (error) throw pgError(error);
    return data.map((b) => b.token);
  }
}
