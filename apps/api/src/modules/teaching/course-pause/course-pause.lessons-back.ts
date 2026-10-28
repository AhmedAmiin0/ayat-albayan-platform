import { Injectable } from '@nestjs/common';
import { LessonEvents } from '../../../common/events/lesson-events';
import { ConflictChecker, LessonWriter, OccurrenceGenerator, ScheduleQueries, SchedulingSettings } from '../scheduling';
import { changedLessons, type RpcOut } from './course-pause.mapper';
import { CoursePauseQueries, type ReopenedLesson } from './course-pause.queries';

const occurrence = (l: ReopenedLesson) => ({ starts_at: new Date(l.starts_at), ends_at: new Date(l.ends_at) });

/** What generating a resumed rule again needs (max-params). */
@Injectable()
export class PauseScheduling {
  constructor(
    readonly rules: ScheduleQueries,
    readonly generator: OccurrenceGenerator,
    readonly settings: SchedulingSettings,
  ) {}
}

/** What clash-checking the lessons booked back needs (max-params). */
@Injectable()
export class PauseClashes {
  constructor(
    readonly queries: CoursePauseQueries,
    readonly checker: ConflictChecker,
    readonly writer: LessonWriter,
  ) {}
}

/**
 * The lessons a resume (or a shortened pause) brings back (docs/11 §7b, R-SCH-04): the resumed rules are topped up
 * from now on their same days and times (the generator stores each clash on its new lesson), and the lessons the
 * RPC reopened or the student rejoined are clash-checked the same way (lessons.conflicts). Every clash is stored
 * and counted for the answer, never dropped.
 */
@Injectable()
export class CoursePauseLessonsBack {
  constructor(
    private readonly sched: PauseScheduling,
    private readonly clashes: PauseClashes,
    private readonly events: LessonEvents,
  ) {}

  /** How many clashes the lessons back have; then LessonEvents tells the balance alerts which lessons changed. */
  async bookBack(out: RpcOut, actorId: string | null): Promise<number> {
    const found = (await this.regenerate(out, actorId)) + (await this.checkReopened(out));
    await this.events.changed(changedLessons(out));
    return found;
  }

  private async regenerate(out: RpcOut, actorId: string | null): Promise<number> {
    if (out.rule_ids.length === 0) return 0;
    const weeks = (await this.sched.settings.read()).booking_horizon_weeks;
    let found = 0;
    for (const id of out.rule_ids) {
      const rule = await this.sched.rules.rule(id);
      if (rule?.status !== 'active') continue;
      found += (await this.sched.generator.topUp(rule, { weeks, actorId })).conflicts.length;
    }
    return found;
  }

  private async checkReopened(out: RpcOut): Promise<number> {
    const lessons = await this.clashes.queries.lessons([...out.reopened, ...out.rejoined]);
    let found = 0;
    for (const teacherId of new Set(lessons.map((l) => l.teacher_id))) {
      const mine = lessons.filter((l) => l.teacher_id === teacherId);
      const proposed = mine.map(occurrence);
      const conflicts = await this.clashes.checker.check({ teacherId, studentIds: [out.student_id], proposed, excludeIds: mine.map((l) => l.id) });
      await this.clashes.writer.flagConflicts(mine, conflicts);
      found += conflicts.length;
    }
    return found;
  }
}
