import {
  proposalApproveSchema,
  proposalRejectSchema,
  type FamilyRequestView,
  type LessonView,
  type ProposalApprove,
  type ProposalReject,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { ProposalDecisionService } from '@/modules/teaching/lessons/proposals/lesson-proposals.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { FamilyRequestAccess } from './family-request.access';
import { familyRequests } from './family-request.mapper';

/**
 * «طلبات الأسر» (owner 2026-11-17): the families' «اطلب موعدًا آخر» waiting for an answer, for an
 * admin (all) and the owning assistant (hers: FamilyRequestAccess). The answer is the same as a
 * teacher's proposal (ProposalDecisionService): approve = the reschedule (409 conflict unless
 * override.reason; `startsAt` = «اختر موعدًا آخر»), reject with a note the family reads.
 */
@ApiTags('lessons')
@ApiBearerAuth()
@Permissions('lessons.reschedule')
@Controller('family-requests')
export class FamilyRequestsController {
  constructor(
    private readonly views: LessonViews,
    private readonly deciding: ProposalDecisionService,
    private readonly access: FamilyRequestAccess,
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
