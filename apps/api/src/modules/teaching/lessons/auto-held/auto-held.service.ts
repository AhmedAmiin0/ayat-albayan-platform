import { autoHeldWindow } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { dueLessons, studentIdsOf } from './auto-held.plan';
import { AutoHeldRepo } from './auto-held.repo';
import { writeAuto } from './auto-outcome';
import { OutcomeSettleService, type SettleSummary } from './outcome-settle.service';

const MINUTE = 60_000;

/** confirmation_required (default) goes to OutcomeSettleService; held_by_default marks it held. */
export type AutoHeldSummary =
  | ({ mode: 'confirmation_required' } & SettleSummary)
  | { mode: 'held_by_default'; due: number; held: number; absent: 0 };

interface Pass {
  now: Date;
  graceMs: number;
}

/** Settles ended lessons after the grace via compare-and-set (per-lesson dedup); actor null. */
@Injectable()
export class AutoHeldService {
  private readonly log = new Logger(AutoHeldService.name);

  constructor(
    private readonly repo: AutoHeldRepo,
    private readonly store: LessonStore,
    private readonly settings: LessonsSettings,
    private readonly settle: OutcomeSettleService,
  ) {}

  async runOnce(now = new Date()): Promise<AutoHeldSummary> {
    const values = await this.settings.read();
    const pass = { now, graceMs: values.lesson_outcome_grace_minutes * MINUTE };
    return values.lesson_confirmation_required ? this.confirmed(pass) : this.heldByDefault(pass);
  }

  private async confirmed(pass: Pass): Promise<AutoHeldSummary> {
    return { mode: 'confirmation_required', ...(await this.settle.runOnce(pass)) };
  }

  private async heldByDefault({ now, graceMs }: Pass): Promise<AutoHeldSummary> {
    // Never a lesson that ended before lesson_outcomes_since() (the deploy): no retro change.
    const since = await this.repo.outcomesSince();
    const window = autoHeldWindow(now, graceMs);
    const from = window.from.getTime() >= since.getTime() ? window.from : since;
    const open = await this.repo.openEnded({ ...window, from });
    const packages = await this.repo.packages(studentIdsOf(open));
    const due = dueLessons({ lessons: open, packages, now, graceMs });
    const w = { store: this.store, log: this.log };
    let held = 0;
    for (const lesson of due) held += Number(await writeAuto(w, lesson, 'completed'));
    return { mode: 'held_by_default', due: due.length, held, absent: 0 };
  }
}
