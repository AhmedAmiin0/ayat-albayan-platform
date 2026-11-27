import { lessonProposalRoutes as routes, lessonProposeRoutes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonProposeService, ProposalDecisionService } from './lesson-proposals.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;
type ProposeIn = RouteInputOf<typeof lessonProposeRoutes.propose>;

/** Teacher proposals and family requests (R-SCH-08); a reject's note reaches the family. */
@ApiBearerAuth()
@Controller()
export class LessonProposalsController {
  constructor(
    private readonly views: LessonViews,
    private readonly proposing: LessonProposeService,
    private readonly deciding: ProposalDecisionService,
  ) {}

  @Route(lessonProposeRoutes.propose)
  async propose(@RouteInput() { params, body }: ProposeIn, @CurrentUser() user: AuthUser) {
    const lessonId = await this.proposing.propose({ lessonId: params.id, body, actor: user });
    return this.views.one(lessonId, user.role);
  }

  @Route(routes.pending)
  async pending() {
    const lessons = await this.views.many(await this.deciding.pendingLessonIds(), 'admin');
    return lessons.filter((l) => l.pending_proposal !== null);
  }

  @Route(routes.approve)
  @HttpCode(200)
  async approve(@RouteInput() { params, body }: In<'approve'>, @CurrentUser() user: AuthUser) {
    const lessonId = await this.deciding.approve({ proposalId: params.id, body, actor: user });
    return this.views.one(lessonId, 'admin');
  }

  @Route(routes.reject)
  @HttpCode(200)
  async reject(@RouteInput() { params, body }: In<'reject'>, @CurrentUser() user: AuthUser) {
    const input = { proposalId: params.id, actor: user, note: body.note };
    const lessonId = await this.deciding.reject(input);
    return this.views.one(lessonId, 'admin');
  }
}
