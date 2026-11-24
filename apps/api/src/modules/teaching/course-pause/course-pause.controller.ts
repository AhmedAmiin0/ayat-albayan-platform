import {
  coursePausePreviewQuery,
  coursePauseResumeSchema,
  coursePauseStartSchema,
  coursePauseUntilSchema,
  type CoursePausePreview,
  type CoursePauseResult,
  type CoursePauseState,
  type CourseResumePreview,
} from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { CoursePausePreviews } from './preview/course-pause.preview';
import { CoursePauseService } from './course-pause.service';

/** Course pause (docs/11 §7b): courses.pause for any student; a pause queues no message. */
@ApiTags('course-pause')
@ApiBearerAuth()
@Controller('students/:id/course-pause')
export class CoursePauseController {
  constructor(
    private readonly pauses: CoursePauseService,
    private readonly previews: CoursePausePreviews,
  ) {}

  /** The open pause (banner) and the past ones. */
  @Get()
  @Permissions('courses.pause')
  state(@Param('id', ParseUUIDPipe) id: string): Promise<CoursePauseState> {
    return this.pauses.state(id);
  }

  /** `?from=&until=`: how many lessons the pause would take the student out of. */
  @Get('preview')
  @Permissions('courses.pause')
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodQuery(coursePausePreviewQuery) query: z.output<typeof coursePausePreviewQuery>,
  ): Promise<CoursePausePreview> {
    return this.previews.preview(id, query);
  }

  /** Resume preview: the lessons booked back and the days the package moves. */
  @Get('resume-preview')
  @Permissions('courses.pause')
  resumePreview(@ZodParam('id', z.uuid()) id: string): Promise<CourseResumePreview> {
    return this.previews.resume(id);
  }

  /** Riyadh dates; from defaults to today; until null means until resumed. */
  @Post()
  @HttpCode(201)
  @Permissions('courses.pause')
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(coursePauseStartSchema, { orEmpty: true })
    body: z.output<typeof coursePauseStartSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CoursePauseResult> {
    return this.pauses.start({ studentId: id, body, actor: user });
  }

  /** `{ untilDate }`: extend or shorten the open pause. */
  @Patch('until')
  @Permissions('courses.pause')
  until(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(coursePauseUntilSchema, { orEmpty: true })
    body: z.output<typeof coursePauseUntilSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CoursePauseResult> {
    return this.pauses.setUntil({ studentId: id, body, actor: user });
  }

  /** Resume now: lessons back from today, package dates moved by the paused days. */
  @Post('resume')
  @HttpCode(200)
  @Permissions('courses.pause')
  resume(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(coursePauseResumeSchema, { orEmpty: true })
    body: z.output<typeof coursePauseResumeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CoursePauseResult> {
    return this.pauses.resume({ studentId: id, body, actor: user });
  }
}
