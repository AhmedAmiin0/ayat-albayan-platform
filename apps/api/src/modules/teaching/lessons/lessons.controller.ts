import { lessonListRoutes as routes } from '@ab/schedule';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { toDay, toWindow } from './store/lesson-queries.schema';
import { LessonViews } from './store/lesson-views';
import { LessonsSettings } from './lessons.settings';
import { OverviewService } from './overview/overview.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** Admin lists across teachers (docs/10 routes 1, 2): every status, by starts_at (R-SCH-01). */
@ApiBearerAuth()
@Controller()
export class LessonsController {
  constructor(
    private readonly views: LessonViews,
    private readonly overviews: OverviewService,
    private readonly settings: LessonsSettings,
  ) {}

  /** Week view: starts_at ∈ [from, to), optional teacherId, at most 31 days. */
  @Route(routes.list)
  list(@RouteInput() { query }: In<'list'>) {
    return this.views.window(toWindow(query), 'admin');
  }

  /** Day view: one local day in `tz` (default settings.academy_timezone). */
  @Route(routes.day)
  async day(@RouteInput() { query }: In<'day'>) {
    const { academy_timezone: tz } = await this.settings.read();
    return this.views.window(toDay(query, tz), 'admin');
  }

  /**
   * All-teachers calendar (R-SCH-09): every teacher with load, windows, time off and free spans,
   * plus the window's lessons. Same `?from&to[&teacherId]` and 31-day cap as the week view.
   */
  @Route(routes.overview)
  overview(@RouteInput() { query }: In<'overview'>) {
    return this.overviews.overview(toWindow(query));
  }
}
