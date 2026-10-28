import { nextFollowUpAt, type FollowUpNote } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { ruleOf, timingOf } from '../../../common/rules/rule-of';
import { Ticker } from '../reminders/ticker';
import { FollowUpSlots, type SlotWindow } from './follow-up-slots';
import { FollowUpsReads } from './follow-ups.deps';
import {
  followUpDedupKey,
  followUpRow,
  followUpStep,
  leadZone,
  pickTwoSlots,
  sameInstant,
  type FollowUpLeadRow,
} from './follow-ups.plan';
import { FollowUpsQueries } from './follow-ups.queries';
import { BackgroundJob } from '../../../config/role/background-job';

const EVERY_MS = 5 * 60_000;
const FIRST_RUN_MS = 60_000;

type Outcome = 'queued' | 'waiting' | 'advanced' | 'notDue' | 'waitingTemplate' | 'noSlots' | 'failed';
export type FollowUpSummary = { leads: number } & Record<Outcome, number>;

interface Tick {
  lead: FollowUpLeadRow;
  hours: readonly number[];
  approved: boolean;
  now: Date;
  /** Free starts, loaded once per tick and only when a lead is due. */
  starts: () => Promise<Date[]>;
}

/**
 * R-LEAD-05 follow-up scheduler (docs/12 §7): every 5 minutes, single flight. A lead in
 * interested_no_slot / no_reply, not paused, whose nextFollowUpAt (follow_up_hours[stage] after
 * its last message) has passed gets follow_up_slots with two real free slots, keyed by this
 * silence and stage (rule 8). The stage advances (compare-and-set) only once that row left, on a
 * later tick (followUpStep); after the last stage nothing more is sent. leads.next_follow_up_at
 * and follow_up_note are kept current for the lead panel.
 * - follow_up_slots not approved → nothing queued, the stage stays (note waiting_template): the
 *   follow-up goes out on the first tick after approval.
 * - fewer than two free slots → nothing queued, retried next tick (note no_slots).
 * - settings.auto_messages_enabled OFF, the follow_up_slots rule OFF or unreadable (fail closed) →
 *   the tick does nothing: no row queued, no stage advanced. Stages and slot window: the rule's timing.
 * TODO(owner/integrator): «else an admin task» needs an admin_task_kind value (migration + types).
 */
@BackgroundJob({ name: 'follow-ups' })
@Injectable()
export class FollowUpsJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(FollowUpsJob.name);
  private readonly ticker = new Ticker({
    name: FollowUpsJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: FollowUpsQueries,
    private readonly slots: FollowUpSlots,
    private readonly reads: FollowUpsReads,
  ) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  kick(): Promise<unknown> {
    return this.ticker.tick();
  }

  /** One pass. Never throws; one lead's failure doesn't stop the others. */
  async runOnce(now = new Date()): Promise<FollowUpSummary> {
    const summary: FollowUpSummary = {
      ...{ leads: 0, queued: 0, waiting: 0, advanced: 0 },
      ...{ notDue: 0, waitingTemplate: 0, noSlots: 0, failed: 0 },
    };
    try {
      const { auto_messages_enabled: auto } = await this.reads.settings.read();
      if (!auto) return summary; // automatic messages OFF (docs/09 cut-over): nothing queued or advanced
      const timing = await this.timing();
      if (!timing) return summary; // the follow_up_slots rule OFF or unread: nothing queued or advanced
      const { hours, ...win } = timing;
      const leads = await this.queries.candidates(hours.length);
      summary.leads = leads.length;
      const approved = leads.length > 0 && (await this.queries.approved());
      let starts: Promise<Date[]> | null = null;
      const lazyStarts = () => (starts ??= this.slots.freeStarts(now, win));
      for (const lead of leads) summary[await this.process({ lead, hours, approved, now, starts: lazyStarts })] += 1;
    } catch (e) {
      this.log.error(`follow-ups run aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (summary.queued + summary.advanced + summary.failed > 0) this.log.log(`follow-ups: ${JSON.stringify(summary)}`);
    return summary;
  }

  /** The follow_up_slots rule's timing while it is on; null when off or unreadable (logged by the policy). */
  private async timing(): Promise<({ hours: readonly number[] } & SlotWindow) | null> {
    const snap = await this.reads.policy.snapshot();
    const rule = snap && ruleOf(snap, 'follow_up_slots');
    if (!snap || !rule?.enabled) return null;
    const s = snap.settings; // a legacy value the rule schema refuses is still used as before
    return timingOf(rule, 'follow_up_slots') ?? { hours: s.follow_up_hours, slots_from_hours: s.follow_up_slots_from_hours, slots_to_days: s.follow_up_slots_to_days };
  }

  private async process(t: Tick): Promise<Outcome> {
    const { lead } = t;
    try {
      return await this.step(t);
    } catch (e) {
      this.log.warn(`follow-up for lead ${lead.id} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 'failed';
    }
  }

  private async step(t: Tick): Promise<Outcome> {
    const { lead, hours, now } = t;
    const due = nextFollowUpAt(lead, hours);
    if (!due || due > now) return this.note(t, { due, note: null, outcome: 'notDue' });
    const prior = await this.queries.stageRow(followUpDedupKey(lead));
    const step = followUpStep(prior);
    if (step === 'advance') {
      const next = nextFollowUpAt({ ...lead, follow_up_stage: lead.follow_up_stage + 1 }, hours);
      await this.queries.advance({ id: lead.id, stage: lead.follow_up_stage, next });
      return 'advanced';
    }
    if (step === 'wait') return this.note(t, { due, note: 'queued', outcome: 'waiting' });
    if (!t.approved) return this.note(t, { due, note: 'waiting_template', outcome: 'waitingTemplate' });
    const zone = leadZone(lead);
    const pair = pickTwoSlots(await t.starts(), zone.tz);
    if (!pair) return this.note(t, { due, note: 'no_slots', outcome: 'noSlots' });
    if (step === 'requeue' && prior) await this.queries.drop(prior.id);
    const added = await this.queries.queue(followUpRow({ lead, slots: pair, zone, now }));
    return this.note(t, { due, note: 'queued', outcome: added > 0 ? 'queued' : 'waiting' });
  }

  /** Writes next_follow_up_at / follow_up_note only when they changed, then reports `outcome`. */
  private async note(t: Tick, s: { due: Date | null; note: FollowUpNote | null; outcome: Outcome }): Promise<Outcome> {
    const { lead } = t;
    if (!sameInstant(lead.next_follow_up_at, s.due) || lead.follow_up_note !== s.note) {
      await this.queries.sync(lead.id, { next_follow_up_at: s.due?.toISOString() ?? null, follow_up_note: s.note });
    }
    return s.outcome;
  }
}
