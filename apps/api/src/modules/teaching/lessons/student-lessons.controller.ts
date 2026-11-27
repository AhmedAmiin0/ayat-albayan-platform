import { studentLessonRoutes as routes } from '@ab/schedule';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonViews } from './store/lesson-views';

/** GET /students/:id/lessons — newest first with the lesson number (R-LES-03). Admin only. */
@ApiBearerAuth()
@Controller()
export class StudentLessonsController {
  constructor(private readonly views: LessonViews) {}

  @Route(routes.list)
  list(@RouteInput() { params, query }: RouteInputOf<typeof routes.list>) {
    return this.views.student(params.id, query);
  }
}
