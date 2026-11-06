import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { EVOLUTION_NUMBER_OFF } from '@/modules/messaging/numbers';

// The sender's writes for an Evolution number (docs/19 «Evolution driver»): a paced row is moved
// to later (never slept on), the day's sends are counted for the cap, and a row pinned to a number
// that can no longer send fails visibly (staff resend it).

interface DeferInput {
  id: string;
  numberId: string;
  phone: string;
  at: Date;
}

/** PostgREST: the row itself, or a sibling on this number / on none yet, due before `at`. */
export function deferFilter(input: DeferInput, at: string): string {
  const before = `or(next_attempt_at.is.null,next_attempt_at.lt.${at})`;
  const mine = `number_id.eq.${input.numberId}`;
  return `id.eq.${input.id},and(${mine},${before}),and(number_id.is.null,${before})`;
}

@Injectable()
export class EvolutionPaceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The row, and every queued row to `phone` on this number (or not tied to a number yet:
   * number_id is stamped at claim) due before `at`, is due again at `at`, no attempt counted: one
   * conversation moves together, and the pass's created_at order keeps it in order. A sibling
   * already due later (a retry backoff) keeps its own time.
   */
  async deferRecipient(input: DeferInput): Promise<void> {
    const at = input.at.toISOString();
    const { error } = await this.db.from('messages').update({ next_attempt_at: at })
      .eq('phone_e164', input.phone).eq('direction', 'outbound').eq('status', 'queued')
      .or(deferFilter(input, at));
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
