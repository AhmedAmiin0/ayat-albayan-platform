import {
  coursePausePreviewQuery,
  coursePauseResumeSchema,
  coursePauseStartSchema,
  coursePauseUntilSchema,
  type CoursePausePreview,
  type CoursePauseResult,
  type CoursePauseState,
} from '@ab/shared';
import { Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { CoursePauseService } from './course-pause.service';
import { UuidParam } from '@/common/http/uuid-param';

/**
 * «إيقاف مؤقت» / «استئناف» of a student's course (owner 2026-10-28, docs/11 §7b, docs/16 row 37c). One narrow key,
 * courses.pause (system admin and sales by default, migration 958), for ANY student: the admin's student file and
 * the assistant's «تفاصيل الطالب» call the same routes. 404 student_not_found; 400 date_in_past / invalid_range;
 * 409 already_paused / pause_not_open. A pause queues no message (its lessons' queued reminders are dropped).
 */
@ApiTags('course-pause')
@ApiBearerAuth()
@Controller('students/:id/course-pause')
export class CoursePauseController {
  constructor(private readonly pauses: CoursePauseService) {}

  /** The open pause (banner) and the past ones. */
  @Get()
  @Permissions('courses.pause')
  state(@UuidParam('id') id: string): Promise<CoursePauseState> {
    return this.pauses.state(id);
  }

  /** `?from=&until=`: how many lessons the pause would take the student out of. */
  @Get('preview')
  @Permissions('courses.pause')
  preview(
    @UuidParam('id') id: string,
    @ZodQuery(coursePausePreviewQuery) query: z.output<typeof coursePausePreviewQuery>,
  ): Promise<CoursePausePreview> {
    return this.pauses.preview(id, query);
  }

  /** `{ fromDate?, untilDate?, reason? }` (Riyadh dates; from defaults to today, until null = until «استئناف»). */
  @Post()
  @HttpCode(201)
  @Permissions('courses.pause')
  start(
    @UuidParam('id') id: string,
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
    @UuidParam('id') id: string,
    @ZodBody(coursePauseUntilSchema, { orEmpty: true })
    body: z.output<typeof coursePauseUntilSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CoursePauseResult> {
    return this.pauses.setUntil({ studentId: id, body, actor: user });
  }

  /** «استئناف الدورة» now: lessons back from today, the package's dates moved by the paused days. `{ subscriptionId? }`. */
  @Post('resume')
  @HttpCode(200)
  @Permissions('courses.pause')
  resume(
    @UuidParam('id') id: string,
    @ZodBody(coursePauseResumeSchema, { orEmpty: true })
    body: z.output<typeof coursePauseResumeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CoursePauseResult> {
    return this.pauses.resume({ studentId: id, body, actor: user });
  }
}
