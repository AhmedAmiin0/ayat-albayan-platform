import { lessonProposalRequestSchema, proposalApproveSchema, type LessonView } from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { LessonProposeService, ProposalDecisionService } from './lesson-proposals.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';

/**
 * Teacher self-service «اقترح ميعاد تاني» and the admin's answer (R-SCH-08). Every route returns
 * LessonView(s); a lesson's pending proposal is LessonView.pending_proposal.
 */
@ApiTags('lessons')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller()
export class LessonProposalsController {
  constructor(
    private readonly views: LessonViews,
    private readonly proposing: LessonProposeService,
    private readonly deciding: ProposalDecisionService,
  ) {}

  /** 201: the lesson, now with its pending proposal. */
  @Post('lessons/:id/propose')
  @Permissions('self.teacher')
  async propose(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(lessonProposalRequestSchema) req: z.output<typeof lessonProposalRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const lessonId = await this.proposing.propose({ lessonId: id, body: req, actor: user });
    return this.views.one(lessonId, user.role);
  }

  /** Lessons waiting for an answer (still open: a closed lesson's proposal is moot). */
  @Get('lesson-proposals')
  async pending(): Promise<LessonView[]> {
    const lessons = await this.views.many(await this.deciding.pendingLessonIds(), 'admin');
    return lessons.filter((l) => l.pending_proposal !== null);
  }

  /** 200: the moved lesson. 409 conflict (retry with override.reason), 409 proposal_decided. */
  @Post('lesson-proposals/:id/approve')
  @HttpCode(200)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(proposalApproveSchema, { orEmpty: true }) req: z.output<typeof proposalApproveSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const lessonId = await this.deciding.approve({ proposalId: id, body: req, actor: user });
    return this.views.one(lessonId, 'admin');
  }

  @Post('lesson-proposals/:id/reject')
  @HttpCode(200)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    return this.views.one(await this.deciding.reject({ proposalId: id, actor: user }), 'admin');
  }
}
