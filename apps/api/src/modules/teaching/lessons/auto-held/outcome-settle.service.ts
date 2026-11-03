import { AUTO_HELD_MAX_AGE_MS, decideLessonOutcome, type OutcomeDecision } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import type { OpenEndedLesson } from './auto-held.plan';
import { AutoHeldRepo } from './auto-held.repo';
import { writeAuto, type AutoTo } from './auto-outcome';

/** Lessons per verdict this pass; lost = changed meanwhile (the compare-and-set lost). */
export interface SettleSummary {
  held: number;
  absent: number;
  /** Still «يحتاج تأكيد» with no platform reminder: counted, listed for the assistant. */
  unresolved: number;
  waiting: number;
  skipped: number;
  lost: number;
}

export interface SettleInput {
  now: Date;
  graceMs: number;
}

type Tally = Exclude<keyof SettleSummary, 'lost'>;
interface Rule {
  to: AutoTo | null;
  tally: Tally;
}
/** Each verdict's write (null = none) and the summary field it adds to. */
const ON_DECISION: Record<OutcomeDecision, Rule> = {
  completed: { to: 'completed', tally: 'held' },
  no_show: { to: 'no_show', tally: 'absent' },
  unresolved: { to: null, tally: 'unresolved' },
  wait: { to: null, tally: 'waiting' },
  skip: { to: null, tally: 'skipped' },
};
const EMPTY: SettleSummary = { held: 0, absent: 0, unresolved: 0, waiting: 0, skipped: 0, lost: 0 };

const latest = (a: Date, b: Date): Date => (a.getTime() >= b.getTime() ? a : b);

/**
 * Confirmation required (owner 2026-11-03, the default): once a lesson ended + the grace, a
 * confirmed one → completed, a scheduled one whose family reminder the platform sent (no «نعم»
 * came, or it would be confirmed) → no_show «غائب», a scheduled one without → left «يحتاج تأكيد»
 * (v_package_lessons already counts it, migration 999). Only lessons that ended after
 * lesson_outcomes_since() (the deploy), 14 days back at most. Idempotent: compare-and-set.
 */
@Injectable()
export class OutcomeSettleService {
  private readonly log = new Logger(OutcomeSettleService.name);

  constructor(
    private readonly repo: AutoHeldRepo,
    private readonly store: LessonStore,
  ) {}

  async runOnce({ now, graceMs }: SettleInput): Promise<SettleSummary> {
    const since = await this.repo.outcomesSince();
    const from = latest(since, new Date(now.getTime() - AUTO_HELD_MAX_AGE_MS));
    const open = await this.repo.openEnded({ from, until: new Date(now.getTime() - graceMs) });
    const reminded = await this.repo.reminded(open.map((l) => l.id));
    const summary = { ...EMPTY };
    for (const lesson of open) {
      const verdict = decideLessonOutcome(
        { status: lesson.status, ends_at: lesson.ends_at, reminded: reminded.has(lesson.id) },
        { now, graceMs, since },
      );
      await this.apply(lesson, ON_DECISION[verdict], summary);
    }
    return summary;
  }

  private async apply(lesson: OpenEndedLesson, rule: Rule, summary: SettleSummary): Promise<void> {
    const w = { store: this.store, log: this.log };
    const written = rule.to === null || (await writeAuto(w, lesson, rule.to));
    summary[written ? rule.tally : 'lost'] += 1;
  }
}
