import { FOLLOW_UP_STATUSES, type FollowUpNote } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { OwnNumbers } from '../numbers';
import type { QueuedMessage } from '../reminders/queued-row';
import { approvedTemplates, queueMessages } from '../reminders/reminders.queries';
import { readAll } from '../../teaching/scheduling/read-all';
import { dbError } from '../../../common/http/http';
import type { FollowUpLeadRow, StageRow } from './follow-ups.plan';

const LEAD_SELECT =
  'id, phone_e164, tz, qualification, status, follow_up_paused, follow_up_stage, last_inbound_at, created_at, next_follow_up_at, follow_up_note' as const;

/** leads columns the job keeps current for the lead panel (followUps.next / followUps.note). */
interface LeadFollowUpState {
  next_follow_up_at: string | null;
  follow_up_note: FollowUpNote | null;
}

export interface AdvanceInput {
  id: string;
  /** The stage just sent; the update is a compare-and-set on it. */
  stage: number;
  next: Date | null;
}

/** Reads and idempotent writes of the follow-up job (R-LEAD-05, docs/12 §7). */
@Injectable()
export class FollowUpsQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    /** The academy's own numbers: their old lead never gets a follow-up (owner 2026-10-27). */
    @Optional() private readonly own?: OwnNumbers,
  ) {}

  /** Leads in a follow-up status, not paused, with a follow-up left (stage < stages); never our own numbers. */
  async candidates(stages: number): Promise<FollowUpLeadRow[]> {
    const own = this.own ? await this.own.notIn() : null;
    return readAll((from, to) => {
      let query = this.db
        .from('leads')
        .select(LEAD_SELECT)
        .in('status', [...FOLLOW_UP_STATUSES])
        .eq('follow_up_paused', false)
        .lt('follow_up_stage', stages);
      if (own) query = query.not('phone_e164', 'in', own);
      return query.order('id').range(from, to);
    });
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

  /** The row already queued for this follow-up (its dedup key), if any. */
  async stageRow(dedupKey: string): Promise<StageRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, status, error_code')
      .eq('dedup_key', dedupKey)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Frees the key of a follow-up that expired / went stale unsent, so fresh slots can go out. */
  async drop(id: string): Promise<void> {
    const { error } = await this.db.from('messages').delete().eq('id', id).eq('status', 'failed');
    if (error) throw dbError(error);
  }

  /** Keeps next_follow_up_at (the computed due time) and follow_up_note current for the lead panel. */
  async sync(id: string, state: LeadFollowUpState): Promise<void> {
    const { error } = await this.db.from('leads').update(state).eq('id', id);
    if (error) throw dbError(error);
  }

  /** stage → stage + 1 (CAS): false when another run, or a new inbound, changed it meanwhile. */
  async advance(input: AdvanceInput): Promise<boolean> {
    const { data, error } = await this.db
      .from('leads')
      .update({
        follow_up_stage: input.stage + 1,
        next_follow_up_at: input.next?.toISOString() ?? null,
        follow_up_note: null,
      })
      .eq('id', input.id)
      .eq('follow_up_stage', input.stage)
      .select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }
}
