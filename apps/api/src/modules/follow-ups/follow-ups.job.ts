import { nextFollowUpAt } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { Ticker } from '../reminders/ticker';
import { FollowUpSlots } from './follow-up-slots';
import { followUpRow, leadZone, pickTwoSlots, sameInstant, type FollowUpLeadRow } from './follow-ups.plan';
import { FollowUpsQueries } from './follow-ups.queries';

const EVERY_MS = 5 * 60_000;
const FIRST_RUN_MS = 60_000;

type Outcome = 'queued' | 'notDue' | 'waitingTemplate' | 'noSlots' | 'failed';
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
 * its last message) has passed gets follow_up_slots with two real free slots; the stage advances
 * (compare-and-set), and after the last stage nothing more is sent. leads.next_follow_up_at is
 * kept equal to the computed due time for the UI.
 * - follow_up_slots not approved → nothing queued, the stage stays: the follow-up goes out on the
 *   first tick after approval (the Templates page already flags the template; see TODO below).
 * - fewer than two free slots → nothing queued, retried next tick (followUps.noSlots).
 * TODO(owner/integrator): «else an admin task» needs an admin_task_kind value (migration + types).
 */
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
    private readonly settings: SettingsService,
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
    const summary: FollowUpSummary = { leads: 0, queued: 0, notDue: 0, waitingTemplate: 0, noSlots: 0, failed: 0 };
    try {
      const { follow_up_hours: hours } = await this.settings.all();
      const leads = await this.queries.candidates(hours.length);
      summary.leads = leads.length;
      const approved = leads.length > 0 && (await this.queries.approved());
      let starts: Promise<Date[]> | null = null;
      const lazyStarts = () => (starts ??= this.slots.freeStarts(now));
      for (const lead of leads) summary[await this.process({ lead, hours, approved, now, starts: lazyStarts })] += 1;
    } catch (e) {
      this.log.error(`follow-ups run aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (summary.queued + summary.failed + summary.noSlots > 0) this.log.log(`follow-ups: ${JSON.stringify(summary)}`);
    return summary;
  }

  private async process(t: Tick): Promise<Outcome> {
    const { lead, hours, now } = t;
    try {
      const due = nextFollowUpAt(lead, hours);
      if (!sameInstant(lead.next_follow_up_at, due)) await this.queries.setNext(lead.id, due);
      if (!due || due > now) return 'notDue';
      if (!t.approved) return 'waitingTemplate';
      const zone = leadZone(lead);
      const pair = pickTwoSlots(await t.starts(), zone.tz);
      if (!pair) return 'noSlots';
      await this.queries.queue(followUpRow({ lead, slots: pair, zone, now }));
      const next = nextFollowUpAt({ ...lead, follow_up_stage: lead.follow_up_stage + 1 }, hours);
      await this.queries.advance({ id: lead.id, stage: lead.follow_up_stage, next });
      return 'queued';
    } catch (e) {
      this.log.warn(`follow-up for lead ${lead.id} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 'failed';
    }
  }
}
