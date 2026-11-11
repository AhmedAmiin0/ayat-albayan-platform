import { teacherCancelSchema, type LessonView } from '@ab/shared';
import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { TeacherLessonService } from './teacher-lesson.service';

/**
 * docs/46 C3/C4: the teacher's own cancel and «سأحضر», under self.teacher. Never the admin's
 * /lessons/:id/cancel (lessons.write); 403 on another teacher's lesson.
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me/lessons')
export class TeacherLessonController {
  constructor(
    private readonly lessons: TeacherLessonService,
    private readonly views: LessonViews,
  ) {}

  /** 409 lesson_started / invalid_transition; the reason is required. */
  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(teacherCancelSchema) req: z.output<typeof teacherCancelSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const lessonId = await this.lessons.cancel({ lessonId: id, reason: req.reason, actor: user });
    return this.views.one(lessonId, user.role);
  }

  /** 409 lesson_started / lesson_closed; already confirmed → unchanged. */
  @Post(':id/confirm-attendance')
  @HttpCode(200)
  async confirm(
    @ZodParam('id', z.uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    return this.views.one(await this.lessons.confirm(id, user), user.role);
  }
}
