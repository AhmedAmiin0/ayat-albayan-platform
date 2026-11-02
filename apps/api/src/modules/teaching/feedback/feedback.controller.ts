import {
  feedbackQuerySchema,
  feedbackRequestSchema,
  type FeedbackRequestResult,
  type FeedbackRowView,
  type TeacherFeedbackSummary,
  type TeacherFeedbackView,
} from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { pageQuerySchema, type Page } from '@/common/http/http';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { FeedbackReadService } from './read/feedback.read.service';
import { FeedbackRequestService } from './request/feedback.request.service';

type FeedbackQuery = z.output<typeof feedbackQuerySchema>;
type PageQuery = z.output<typeof pageQuerySchema>;

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
    @ZodBody(feedbackRequestSchema) body: z.output<typeof feedbackRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<FeedbackRequestResult> {
    return this.requests.request({ lessonId: id, body, actorId: user.id });
  }

  @Get('feedback')
  list(
    @ZodQuery(feedbackQuerySchema) filter: FeedbackQuery,
    @ZodQuery(pageQuerySchema) page: PageQuery,
  ): Promise<Page<FeedbackRowView>> {
    return this.reads.list(filter, page);
  }

  @Get('feedback/summary')
  summary(): Promise<TeacherFeedbackSummary[]> {
    return this.reads.summary();
  }

  /** A teacher's own rows and average; contact phone and guardian are never in them. */
  @Get('teachers/me/feedback')
  @Permissions('self.teacher')
  mine(
    @ZodQuery(feedbackQuerySchema) filter: FeedbackQuery,
    @ZodQuery(pageQuerySchema) page: PageQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherFeedbackView> {
    return this.reads.mine(user, { filter, page });
  }
}
