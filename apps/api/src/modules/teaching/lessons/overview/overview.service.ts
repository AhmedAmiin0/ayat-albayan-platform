import type { ScheduleOverview } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { TeachersQueries } from '../../../people/teachers/teachers.queries';
import { LessonViews } from '../store/lesson-views';
import type { LessonWindow } from '../lessons.queries';
import { toOverview } from './overview.mapper';
import { OverviewQueries } from './overview.queries';

/**
 * GET /lessons/overview (R-SCH-09, R-NFR-08): one round trip of six independent reads — teachers,
 * weekly rows, time off, lessons running into the window, loads and the window's lessons (numbers and unpaid flags batched by
 * LessonViews) — instead of a per-teacher availability / time-off call (N+1).
 */
@Injectable()
export class OverviewService {
  constructor(
    private readonly queries: OverviewQueries,
    private readonly teachers: TeachersQueries,
    private readonly views: LessonViews,
  ) {}

  async overview(window: LessonWindow): Promise<ScheduleOverview> {
    const [teachers, slots, timeOff, carry, loads, lessons] = await Promise.all([
      this.queries.teachers(window),
      this.queries.slots(window),
      this.queries.timeOff(window),
      this.queries.carryOver(window),
      this.teachers.loads(window.teacherId ? [window.teacherId] : undefined),
      this.views.window(window, 'admin'),
    ]);
    return toOverview({ window, teachers, slots, timeOff, carry, loads, lessons });
  }
}
