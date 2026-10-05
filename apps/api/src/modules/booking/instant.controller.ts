import { instantLessonSchema, type InstantLessonResult } from '@ab/shared';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
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
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<InstantLessonResult> {
    return this.instant.create({ req: parseOrThrow(instantLessonSchema, body), actorId: user.id });
  }
}
