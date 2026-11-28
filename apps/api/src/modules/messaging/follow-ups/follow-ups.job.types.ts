import type { FollowUpLeadRow, StageRow } from './follow-ups.plan';

export type Outcome =
  | 'queued'
  | 'waiting'
  | 'advanced'
  | 'notDue'
  | 'waitingTemplate'
  | 'noSlots'
  | 'failed';

/** A due lead whose follow-up is (re)queued now. */
export interface Pending {
  due: Date;
  prior: StageRow | null;
  step: 'queue' | 'requeue';
}

export interface Tick {
  lead: FollowUpLeadRow;
  hours: readonly number[];
  approved: boolean;
  now: Date;
  /** Free starts, loaded once per tick and only when a lead is due. */
  starts: () => Promise<Date[]>;
}
