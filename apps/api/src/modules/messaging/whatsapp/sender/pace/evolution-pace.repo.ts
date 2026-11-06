import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { EVOLUTION_NUMBER_OFF } from '@/modules/messaging/numbers';

// The sender's writes for an Evolution number (docs/19 «Evolution driver»): a paced row is moved
// to later (never slept on), the day's sends are counted for the cap, and a row pinned to a number
// that can no longer send fails visibly (staff resend it).

@Injectable()
export class EvolutionPaceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Due again at `at`; still queued, no attempt counted (only a queued, unclaimed row moves). */
  async defer(id: string, at: Date): Promise<void> {
    const { error } = await this.db.from('messages').update({ next_attempt_at: at.toISOString() })
      .eq('id', id).eq('status', 'queued');
    if (error) throw new Error(`message defer failed: ${error.message}`);
  }

  /** Outbound rows this number sent since `since` (the daily cap). */
  async sentSince(numberId: string, since: Date): Promise<number> {
    const { count, error } = await this.db.from('messages').select('id', { count: 'exact', head: true })
      .eq('number_id', numberId).eq('direction', 'outbound').gte('sent_at', since.toISOString());
    if (error) throw new Error(`evolution send count failed: ${error.message}`);
    return count ?? 0;
  }

  /** The number is off, restricted or removed: the queued row fails (never left skipped). */
  async failOff(id: string): Promise<void> {
    const text = 'The Evolution number was switched off or removed; resend from another number.';
    const { error } = await this.db.from('messages')
      .update({ status: 'failed', error_code: EVOLUTION_NUMBER_OFF, error_text: text, next_attempt_at: null })
      .eq('id', id).eq('status', 'queued');
    if (error) throw new Error(`message failure write failed: ${error.message}`);
  }
}
