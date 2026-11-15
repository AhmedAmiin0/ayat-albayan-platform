import { Inject, Injectable } from '@nestjs/common';
import { PushService, type PushTarget } from '@/common/push/push.service';
import { REPORT_LOOKBACK_MIN, FamilyPushRepo } from './family-push.repo';
import { lessonStartingPushes, reportSentPushes, windowJustOpened } from './family-push.plan';

export interface FamilyPushSummary {
  /** Lessons whose join window just opened. */
  lessons: number;
  /** Reports sent to the family in the lookback. */
  reports: number;
  /** Push targets handed to PushService (a repeat is a no-op there: its dedup key). */
  targets: number;
}

const MIN_MS = 60_000;

/**
 * One sweep of the family app's pushes (docs/50 §5 item 6): lesson_starting for each lesson whose
 * join window just opened (settings.join_opens_before_min, joinWindow), report_sent for each report
 * stamped sent (lesson_reports.sent_at, after the report_ready message went out; every send path
 * stamps it there). PushService applies each kind's rule (off: nothing; push off: the bell row),
 * the readers (a child: no money) and the dedup key `{kind}:{lesson|report}:{profile}` (rule 8).
 */
@Injectable()
export class FamilyPushService {
  constructor(
    @Inject(FamilyPushRepo) private readonly repo: FamilyPushRepo,
    @Inject(PushService) private readonly push: PushService,
  ) {}

  async runOnce(now: Date): Promise<FamilyPushSummary> {
    const win = await this.repo.window();
    const near = await this.repo.lessonsNearStart(now, win);
    const opened = near.filter((l) => windowJustOpened(l, now, win));
    const since = new Date(now.getTime() - REPORT_LOOKBACK_MIN * MIN_MS);
    const reports = await this.repo.reportsSentSince(since);
    const targets: PushTarget[] = [
      ...opened.flatMap(lessonStartingPushes),
      ...reports.flatMap(reportSentPushes),
    ];
    for (const target of targets) await this.push.notifyProfiles(target);
    return { lessons: opened.length, reports: reports.length, targets: targets.length };
  }
}
