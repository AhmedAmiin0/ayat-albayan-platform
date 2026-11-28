import { familyRequestRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ProposalDecisionService } from '@/modules/teaching/lessons/proposals/lesson-proposals.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { FamilyRequestAccess } from './family-request.access';
import { familyRequests } from './family-request.mapper';

type In<K extends 'approve' | 'reject'> = RouteInputOf<(typeof routes)[K]>;

/** Pending family requests: admins see all, the owning assistant hers; approve is a reschedule. */
@ApiBearerAuth()
@Controller()
export class FamilyRequestsController {
  constructor(
    @Inject(LessonViews) private readonly views: LessonViews,
    @Inject(ProposalDecisionService) private readonly deciding: ProposalDecisionService,
    @Inject(FamilyRequestAccess) private readonly access: FamilyRequestAccess,
  ) {}

  @Route(routes.pending)
  async pending(@CurrentUser() user: AuthUser) {
    const lessons = await this.views.many(await this.deciding.pendingLessonIds('family'), 'admin');
    const open = lessons.filter((l) => l.pending_proposal !== null);
    return familyRequests(await this.access.visible(user, open));
  }

  @Route(routes.approve)
  @HttpCode(200)
  async approve(@RouteInput() { params, body }: In<'approve'>, @CurrentUser() user: AuthUser) {
    await this.access.assertRequest(user, params.id);
    const lessonId = await this.deciding.approve({ proposalId: params.id, body, actor: user });
    return this.views.one(lessonId, 'admin');
  }

  @Route(routes.reject)
  @HttpCode(200)
  async reject(@RouteInput() { params, body }: In<'reject'>, @CurrentUser() user: AuthUser) {
    await this.access.assertRequest(user, params.id);
    const input = { proposalId: params.id, actor: user, note: body.note };
    const lessonId = await this.deciding.reject(input);
    return this.views.one(lessonId, 'admin');
  }
}
