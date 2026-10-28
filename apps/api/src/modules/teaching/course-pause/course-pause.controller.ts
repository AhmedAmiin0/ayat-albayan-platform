import {
  coursePausePreviewQuery,
  coursePauseResumeSchema,
  coursePauseStartSchema,
  coursePauseUntilSchema,
  type CoursePausePreview,
  type CoursePauseResult,
  type CoursePauseState,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { CoursePauseService } from './course-pause.service';

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
  state(@Param('id', ParseUUIDPipe) id: string): Promise<CoursePauseState> {
    return this.pauses.state(id);
  }

  /** `?from=&until=`: how many lessons the pause would take the student out of. */
  @Get('preview')
  @Permissions('courses.pause')
  preview(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<CoursePausePreview> {
    return this.pauses.preview(id, parseOrThrow(coursePausePreviewQuery, query ?? {}));
  }

  /** `{ fromDate?, untilDate?, reason? }` (Riyadh dates; from defaults to today, until null = until «استئناف»). */
  @Post()
  @HttpCode(201)
  @Permissions('courses.pause')
  start(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CoursePauseResult> {
    return this.pauses.start({ studentId: id, body: parseOrThrow(coursePauseStartSchema, body ?? {}), actor: user });
  }

  /** `{ untilDate }`: extend or shorten the open pause. */
  @Patch('until')
  @Permissions('courses.pause')
  until(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CoursePauseResult> {
    return this.pauses.setUntil({ studentId: id, body: parseOrThrow(coursePauseUntilSchema, body ?? {}), actor: user });
  }

  /** «استئناف الدورة» now: lessons back from today, the package's dates moved by the paused days. `{ subscriptionId? }`. */
  @Post('resume')
  @HttpCode(200)
  @Permissions('courses.pause')
  resume(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CoursePauseResult> {
    return this.pauses.resume({ studentId: id, body: parseOrThrow(coursePauseResumeSchema, body ?? {}), actor: user });
  }
}
