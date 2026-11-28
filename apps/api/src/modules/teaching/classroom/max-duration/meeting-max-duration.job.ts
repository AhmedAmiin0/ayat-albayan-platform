import { Injectable, Logger } from '@nestjs/common';
import { BackgroundJob } from '@/config/role/background-job';
import { Ticker, TickerJob } from '@/common/jobs';
import {
  meetingTarget,
  roomNameOf,
} from '@/modules/teaching/classroom/recordings/recording-target';
import { MaxDurationRepo } from './max-duration.repo';
import {
  cutoffOf,
  meetingOverdue,
  openTooLong,
  ownedRooms,
  type OwnedRoom,
} from './max-duration.rule';
import { MaxDurationSettings } from './max-duration.settings';
import { MeetingAutoEnd } from './meeting-auto-end';
import { RoomCloser } from './room-closer';

const EVERY_MS = 5 * 60_000;
/** Not on boot: every API test boots AppModule. */
const FIRST_RUN_MS = 2 * 60_000;

/** Counts only: no names, phones or ids in the log. */
interface MaxDurationSummary {
  ended: number;
  closed: number;
  failed: number;
}

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Closes meetings and rooms older than meeting_max_minutes; never touches lessons; idempotent. */
@BackgroundJob({ name: 'meeting-max-duration' })
@Injectable()
export class MeetingMaxDurationJob extends TickerJob {
  private readonly log = new Logger(MeetingMaxDurationJob.name);
  protected readonly ticker = new Ticker({
    name: MeetingMaxDurationJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly repo: MaxDurationRepo,
    private readonly rooms: RoomCloser,
    private readonly meetings: MeetingAutoEnd,
    private readonly settings: MaxDurationSettings,
  ) {
    super();
  }

  /** One pass. Never throws. */
  async runOnce(now = new Date()): Promise<MaxDurationSummary> {
    const summary: MaxDurationSummary = { ended: 0, closed: 0, failed: 0 };
    try {
      const cutoff = cutoffOf((await this.settings.read()).meeting_max_minutes, now);
      if (!cutoff) return summary;
      const handled = await this.endMeetings({ cutoff, now, summary });
      await this.sweepRooms({ cutoff, now, summary }, handled);
    } catch (e) {
      this.log.error(`meeting max duration run aborted: ${why(e)}`);
    }
    if (summary.ended + summary.closed + summary.failed > 0) {
      this.log.log(`meeting max duration: ${JSON.stringify(summary)}`);
    }
    return summary;
  }

  /** Step 1; answers the room names it already closed (the sweep skips them). */
  private async endMeetings(run: Run): Promise<Set<string>> {
    const handled = new Set<string>();
    for (const m of await this.repo.overdueMeetings(run.cutoff)) {
      if (!meetingOverdue(m, run.cutoff)) continue;
      try {
        if (await this.meetings.end(m.id, run.now)) run.summary.ended += 1;
      } catch (e) {
        run.summary.failed += 1;
        this.log.warn(`meeting auto end failed: ${why(e)}`);
      }
      if (!this.rooms.configured) continue;
      const target = meetingTarget(m.id);
      handled.add(roomNameOf(target));
      await this.close({ ...run, target });
    }
    return handled;
  }

  /** Step 2, over the rooms LiveKit has now. */
  private async sweepRooms(run: Run, handled: ReadonlySet<string>): Promise<void> {
    if (!this.rooms.configured) return;
    const owned = ownedRooms(await this.rooms.list(), handled);
    const due = owned.filter((r) => openTooLong(r.createdAt, run.cutoff));
    for (const room of due) await this.close({ ...run, target: room.target });
  }

  private async close(input: Run & { target: OwnedRoom['target'] }): Promise<void> {
    try {
      if (await this.rooms.close(input.target, input.now)) input.summary.closed += 1;
    } catch (e) {
      input.summary.failed += 1;
      this.log.warn(`room close failed (${input.target.kind}): ${why(e)}`);
    }
  }
}

interface Run {
  cutoff: Date;
  now: Date;
  summary: MaxDurationSummary;
}
