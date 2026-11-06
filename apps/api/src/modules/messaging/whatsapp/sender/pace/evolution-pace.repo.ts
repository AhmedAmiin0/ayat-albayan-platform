import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { EVOLUTION_NUMBER_OFF } from '@/modules/messaging/numbers';
import { scopeFilter, type RecipientScope } from './evolution-pace.scope';

// The sender's writes for an Evolution number (docs/19 «Evolution driver»): a paced row is moved
// to later (never slept on), the day's sends are counted for the cap, and a row pinned to a number
// that can no longer send fails visibly (staff resend it).

interface DeferInput extends RecipientScope {
  id: string;
  at: Date;
}

/** An older row of the recipient on this number, queued before `createdAt` (null = unknown). */
interface HeldInput extends RecipientScope {
  createdAt: string | null;
  now: Date;
}

/** PostgREST: the row itself, or a sibling leaving from this number, due before `at`. */
export function deferFilter(input: DeferInput, at: string): string {
  const before = `or(next_attempt_at.is.null,next_attempt_at.lt.${at})`;
  return `id.eq.${input.id},${scopeFilter(input, [before])}`;
}

@Injectable()
export class EvolutionPaceRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The row, and every queued row to `phone` leaving from this number (scopeFilter: never a
   * template or a row of another number) due before `at`, is due again at `at`, no attempt
   * counted: one conversation moves together, and the pass's created_at order keeps it in order.
   * A sibling already due later (a retry backoff) keeps its own time.
   */
  async deferRecipient(input: DeferInput): Promise<void> {
    const at = input.at.toISOString();
    const { error } = await this.db.from('messages').update({ next_attempt_at: at })
      .eq('phone_e164', input.phone).eq('direction', 'outbound').eq('status', 'queued')
      .or(deferFilter(input, at));
    if (error) throw new Error(`message defer failed: ${error.message}`);
  }

  /**
   * Final review 2: when an older queued row of the recipient on this number is already moved to
   * later, the latest such time (the newer row waits behind it); null = none. Read from the DB, so
   * it holds after a restart (the in-memory slots are gone) and after a late re-deferral.
   */
  async heldUntil(input: HeldInput): Promise<Date | null> {
    const q = this.db.from('messages').select('next_attempt_at')
      .eq('phone_e164', input.phone).eq('direction', 'outbound').eq('status', 'queued')
      .gt('next_attempt_at', input.now.toISOString()).or(scopeFilter(input));
    const older = input.createdAt === null ? q : q.lt('created_at', input.createdAt);
    const { data, error } = await older.order('next_attempt_at', { ascending: false }).limit(1);
    if (error) throw new Error(`message order read failed: ${error.message}`);
    const at = data[0]?.next_attempt_at;
    return at ? new Date(at) : null;
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
