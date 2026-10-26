import {
  feedbackQuerySchema,
  feedbackRequestSchema,
  type FeedbackRequestResult,
  type FeedbackRowView,
  type TeacherFeedbackSummary,
  type TeacherFeedbackView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQuerySchema, parseOrThrow, type Page } from '../../common/http/http';
import { FeedbackReadService } from './read/feedback.read.service';
import { FeedbackRequestService } from './request/feedback.request.service';

/**
 * «رأيك يهمّنا», the staff side: the admin asks a family for it and reads every answer; a teacher
 * reads their own (the static `teachers/me/…` wins over `teachers/:id` in Fastify's router).
 */
@ApiTags('feedback')
@ApiBearerAuth()
@Permissions('feedback.read')
@Controller()
export class FeedbackController {
  constructor(
    private readonly requests: FeedbackRequestService,
    private readonly reads: FeedbackReadService,
  ) {}

  /** «ابعت طلب الرأي»: 409 template_not_approved / lesson_not_eligible / already_submitted; 503 not_configured. */
  @Post('lessons/:id/feedback-request')
  @HttpCode(200)
  @Permissions('feedback.write')
  request(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<FeedbackRequestResult> {
    return this.requests.request({ lessonId: id, body: parseOrThrow(feedbackRequestSchema, body), actorId: user.id });
  }

  @Get('feedback')
  list(@Query() query: unknown): Promise<Page<FeedbackRowView>> {
    return this.reads.list(parseOrThrow(feedbackQuerySchema, query), parseOrThrow(pageQuerySchema, query));
  }

  @Get('feedback/summary')
  summary(): Promise<TeacherFeedbackSummary[]> {
    return this.reads.summary();
  }

  /** A teacher's own rows and average; contact phone and guardian are never in them. */
  @Get('teachers/me/feedback')
  @Permissions('self.teacher')
  mine(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<TeacherFeedbackView> {
    return this.reads.mine(user, { filter: parseOrThrow(feedbackQuerySchema, query), page: parseOrThrow(pageQuerySchema, query) });
  }
}
