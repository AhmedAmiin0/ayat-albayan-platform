import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { ruleOf, timingOf } from '@/common/rules/rule-of';
import { Ticker } from '@/common/jobs';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import { FollowUpSlots, type SlotWindow } from './follow-up-slots';
import { stepLead, type Outcome, type Tick } from './follow-ups.step';
import { FollowUpsSettings } from './follow-ups.settings';
import { FollowUpsRepo } from './follow-ups.repo';
import { BackgroundJob } from '@/config/role/background-job';

const EVERY_MS = 5 * 60_000;
const FIRST_RUN_MS = 60_000;

export type FollowUpSummary = { leads: number } & Record<Outcome, number>;

/**
 * R-LEAD-05 follow-up scheduler (docs/12 §7): every 5 minutes, single flight. A lead in
 * interested_no_slot / no_reply, not paused, whose nextFollowUpAt (follow_up_hours[stage] after its
 * last message) has passed gets follow_up_slots with two real free slots, keyed by this silence and
 * stage (rule 8). The stage advances (compare-and-set) only once that row left, on a later tick
 * (followUpStep); after the last stage nothing more is sent. next_follow_up_at and follow_up_note
 * stay current for the lead panel.
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
    private readonly queries: FollowUpsRepo,
    private readonly slots: FollowUpSlots,
    private readonly settings: FollowUpsSettings,
    private readonly policy: NotificationPolicy,
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
      const { auto_messages_enabled: auto } = await this.settings.read();
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
    const snap = await this.policy.snapshot();
    const rule = snap && ruleOf(snap, 'follow_up_slots');
    if (!snap || !rule?.enabled) return null;
    const s = snap.settings; // a legacy value the rule schema refuses is still used as before
    return timingOf(rule, 'follow_up_slots') ?? { hours: s.follow_up_hours, slots_from_hours: s.follow_up_slots_from_hours, slots_to_days: s.follow_up_slots_to_days };
  }

  private async process(t: Tick): Promise<Outcome> {
    try {
      return await stepLead(this.queries, t);
    } catch (e) {
      this.log.warn(`follow-up for lead ${t.lead.id} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 'failed';
    }
  }
}
