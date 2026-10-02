import { lessonProposalRequestSchema, proposalApproveSchema, type LessonView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { LessonProposeService, ProposalDecisionService } from './lesson-proposals.service';
import { LessonViews } from './lesson-views';

/**
 * Teacher self-service «اقترح ميعاد تاني» and the admin's answer (R-SCH-08). Every route returns
 * LessonView(s); a lesson's pending proposal is LessonView.pending_proposal.
 */
@ApiTags('lessons')
@ApiBearerAuth()
@Controller()
export class LessonProposalsController {
  constructor(
    private readonly views: LessonViews,
    private readonly proposing: LessonProposeService,
    private readonly deciding: ProposalDecisionService,
  ) {}

  /** 201: the lesson, now with its pending proposal. */
  @Post('lessons/:id/propose')
  @Roles('teacher')
  async propose(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const req = parseOrThrow(lessonProposalRequestSchema, body);
    return this.views.one(await this.proposing.propose({ lessonId: id, body: req, actor: user }), user.role);
  }

  /** Lessons waiting for an answer (still open: a closed lesson's proposal is moot). */
  @Get('lesson-proposals')
  @Roles('admin')
  async pending(): Promise<LessonView[]> {
    const lessons = await this.views.many(await this.deciding.pendingLessonIds(), 'admin');
    return lessons.filter((l) => l.pending_proposal !== null);
  }

  /** 200: the moved lesson. 409 conflict (retry with override.reason), 409 proposal_decided. */
  @Post('lesson-proposals/:id/approve')
  @Roles('admin')
  @HttpCode(200)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const req = parseOrThrow(proposalApproveSchema, body ?? {});
    return this.views.one(await this.deciding.approve({ proposalId: id, body: req, actor: user }), 'admin');
  }

  @Post('lesson-proposals/:id/reject')
  @Roles('admin')
  @HttpCode(200)
  async reject(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<LessonView> {
    return this.views.one(await this.deciding.reject({ proposalId: id, actor: user }), 'admin');
  }
}
