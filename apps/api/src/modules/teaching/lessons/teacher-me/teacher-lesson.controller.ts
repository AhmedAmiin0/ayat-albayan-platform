import { teacherLessonRoutes as routes, type LessonView } from '@ab/schedule';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { TeacherLessonService } from './teacher-lesson.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** 403 on another teacher's lesson; an unlinked teacher is 404 teacher_not_linked. */
@ApiBearerAuth()
@Controller()
export class TeacherLessonController {
  constructor(
    @Inject(TeacherLessonService) private readonly lessons: TeacherLessonService,
    @Inject(LessonViews) private readonly views: LessonViews,
  ) {}

  @Route(routes.cancel)
  @HttpCode(200)
  async cancel(
    @RouteInput() { params, body }: In<'cancel'>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const { reason } = body;
    const lessonId = await this.lessons.cancel({ lessonId: params.id, reason, actor: user });
    return this.views.one(lessonId, user.role);
  }

  @Route(routes.confirm)
  @HttpCode(200)
  async confirm(
    @RouteInput() { params }: In<'confirm'>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    return this.views.one(await this.lessons.confirm(params.id, user), user.role);
  }
}
