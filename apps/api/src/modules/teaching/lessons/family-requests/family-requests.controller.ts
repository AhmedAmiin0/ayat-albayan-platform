import {
  proposalApproveSchema,
  proposalRejectSchema,
  type FamilyRequestView,
  type LessonView,
  type ProposalApprove,
  type ProposalReject,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { z } from 'zod';
import { ProposalDecisionService } from '@/modules/teaching/lessons/proposals/lesson-proposals.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { FamilyRequestAccess } from './family-request.access';
import { familyRequests } from './family-request.mapper';

/** Pending family requests: admins see all, the owning assistant hers; approve is a reschedule. */
@ApiTags('lessons')
@ApiBearerAuth()
@Permissions('lessons.reschedule')
@Controller('family-requests')
export class FamilyRequestsController {
  constructor(
    @Inject(LessonViews) private readonly views: LessonViews,
    @Inject(ProposalDecisionService) private readonly deciding: ProposalDecisionService,
    @Inject(FamilyRequestAccess) private readonly access: FamilyRequestAccess,
  ) {}

  /** Oldest first; a closed lesson's request is moot and left out. */
  @Get()
  async pending(@CurrentUser() user: AuthUser): Promise<FamilyRequestView[]> {
    const lessons = await this.views.many(await this.deciding.pendingLessonIds('family'), 'admin');
    const open = lessons.filter((l) => l.pending_proposal !== null);
    return familyRequests(await this.access.visible(user, open));
  }

  /** 200: the moved lesson. 404, 403 not_your_student, 409 conflict / proposal_decided. */
  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(proposalApproveSchema, { orEmpty: true }) body: ProposalApprove,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    await this.access.assertRequest(user, id);
    const lessonId = await this.deciding.approve({ proposalId: id, body, actor: user });
    return this.views.one(lessonId, 'admin');
  }

  /** 200: the unchanged lesson; the family hears it with `note`. */
  @Post(':id/reject')
  @HttpCode(200)
  async reject(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(proposalRejectSchema, { orEmpty: true }) body: ProposalReject,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    await this.access.assertRequest(user, id);
    const lessonId = await this.deciding.reject({ proposalId: id, actor: user, note: body.note });
    return this.views.one(lessonId, 'admin');
  }
}
