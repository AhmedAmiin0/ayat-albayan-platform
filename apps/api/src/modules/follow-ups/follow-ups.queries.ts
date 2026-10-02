import { FOLLOW_UP_STATUSES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { QueuedMessage } from '../reminders/queued-row';
import { approvedTemplates, queueMessages } from '../reminders/reminders.queries';
import { readAll } from '../scheduling/read-all';
import { dbError } from '../teachers/http';
import type { FollowUpLeadRow } from './follow-ups.plan';

const LEAD_SELECT =
  'id, phone_e164, tz, qualification, status, follow_up_paused, follow_up_stage, last_inbound_at, created_at, next_follow_up_at' as const;

export interface AdvanceInput {
  id: string;
  /** The stage just sent; the update is a compare-and-set on it. */
  stage: number;
  next: Date | null;
}

/** Reads and idempotent writes of the follow-up job (R-LEAD-05, docs/12 §7). */
@Injectable()
export class FollowUpsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Leads in a follow-up status, not paused, with a follow-up left (stage < stages). */
  candidates(stages: number): Promise<FollowUpLeadRow[]> {
    return readAll((from, to) =>
      this.db
        .from('leads')
        .select(LEAD_SELECT)
        .in('status', [...FOLLOW_UP_STATUSES])
        .eq('follow_up_paused', false)
        .lt('follow_up_stage', stages)
        .order('id')
        .range(from, to),
    );
  }

  async approved(): Promise<boolean> {
    return (await approvedTemplates(this.db, ['follow_up_slots'])).has('follow_up_slots');
  }

  queue(row: QueuedMessage): Promise<number> {
    return queueMessages(this.db, [row]);
  }

  /** Active teachers: whose free slots are proposed (the lead has no program / teacher yet). */
  async activeTeacherIds(): Promise<string[]> {
    const { data, error } = await this.db.from('teachers').select('id').eq('status', 'active').order('id');
    if (error) throw dbError(error);
    return data.map((t) => t.id);
  }

  /** Keeps leads.next_follow_up_at = the computed due time, for the lead drawer (followUps.next). */
  async setNext(id: string, at: Date | null): Promise<void> {
    const { error } = await this.db
      .from('leads')
      .update({ next_follow_up_at: at?.toISOString() ?? null })
      .eq('id', id);
    if (error) throw dbError(error);
  }

  /** stage → stage + 1 (CAS): false when another run, or a new inbound, changed it meanwhile. */
  async advance(input: AdvanceInput): Promise<boolean> {
    const { data, error } = await this.db
      .from('leads')
      .update({ follow_up_stage: input.stage + 1, next_follow_up_at: input.next?.toISOString() ?? null })
      .eq('id', input.id)
      .eq('follow_up_stage', input.stage)
      .select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }
}
