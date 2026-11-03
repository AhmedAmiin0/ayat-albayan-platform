import { autoHeldWindow } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { dueLessons, studentIdsOf } from './auto-held.plan';
import { AutoHeldRepo } from './auto-held.repo';
import { writeAuto } from './auto-outcome';
import { OutcomeSettleService, type SettleSummary } from './outcome-settle.service';

const MINUTE = 60_000;

/** confirmation_required (the default): OutcomeSettleService; held_by_default: «انعقدت». */
export type AutoHeldSummary =
  | ({ mode: 'confirmation_required' } & SettleSummary)
  | { mode: 'held_by_default'; due: number; held: number; absent: 0 };

interface Pass {
  now: Date;
  graceMs: number;
}

/**
 * Every ended lesson's outcome after the grace (settings.lesson_outcome_grace_minutes, 30 min).
 * settings.lesson_confirmation_required ON (owner 2026-11-03, the default): OutcomeSettleService
 * (confirmed → completed, reminded with no «نعم» → no_show, else left for the assistant).
 * OFF («انعقدت» by default, owner 2026-11-02): every lesson still scheduled / confirmed (14 days
 * back at most, never before a student's current package) moves to completed. Both write through
 * apply_lesson_changes with a compare-and-set on the status (the per-lesson dedup: a second pass,
 * or a report / cancel meanwhile, changes nothing), audited with actor null. LessonEvents then
 * runs the balance alerts, the trial → «بانتظار الاشتراك» move and the rating.
 */
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
    const open = await this.repo.openEnded(autoHeldWindow(now, graceMs));
    const packages = await this.repo.packages(studentIdsOf(open));
    const due = dueLessons({ lessons: open, packages, now, graceMs });
    const w = { store: this.store, log: this.log };
    let held = 0;
    for (const lesson of due) held += Number(await writeAuto(w, lesson, 'completed'));
    return { mode: 'held_by_default', due: due.length, held, absent: 0 };
  }
}
