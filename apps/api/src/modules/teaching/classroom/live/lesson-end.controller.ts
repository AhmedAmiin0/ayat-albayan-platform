import type { LessonEndResult } from '@ab/schedule';
import { Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam } from '@/common/http/zod-inputs';
import { LessonEndService } from './lesson-end.service';

/** End for everyone: the lesson's teacher or an admin (the service decides per lesson). */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.host')
@Controller('lessons/:id')
export class LessonEndController {
  constructor(@Inject(LessonEndService) private readonly ends: LessonEndService) {}

  /** 200 {endedAt} (idempotent: the first end's time); 404 lesson_not_found, 403. */
  @Post('end')
  @HttpCode(200)
  end(
    @ZodParam('id', z.uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonEndResult> {
    return this.ends.end({ user, lessonId: id });
  }
}
