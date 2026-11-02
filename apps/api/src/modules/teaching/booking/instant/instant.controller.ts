import {
  instantLessonSchema,
  type InstantLessonRequest,
  type InstantLessonResult,
} from '@ab/shared';
import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { InstantLessonService } from './instant.service';

/** «حلقة فورية»: an online lesson that starts now (admin only). */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller('lessons')
export class InstantController {
  constructor(private readonly instant: InstantLessonService) {}

  /** 201 { lessonId }; 409 { code: 'conflict', conflicts } unless override.reason; 404 teacher / student_not_found. */
  @Post('instant')
  create(
    @ZodBody(instantLessonSchema) req: InstantLessonRequest,
    @CurrentUser() user: AuthUser,
  ): Promise<InstantLessonResult> {
    return this.instant.create({ req, actorId: user.id });
  }
}
