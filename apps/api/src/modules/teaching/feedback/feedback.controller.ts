import { feedbackRoutes as routes, type FeedbackListQuery } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { FeedbackReadService } from './read/feedback.read.service';
import { FeedbackRequestService } from './request/feedback.request.service';

const filterAndPage = ({ page, pageSize, ...filter }: FeedbackListQuery) => ({
  filter,
  page: { page, pageSize },
});

/** The static teachers/me route wins over teachers/:id in Fastify's router. */
@ApiBearerAuth()
@Controller()
export class FeedbackController {
  constructor(
    private readonly requests: FeedbackRequestService,
    private readonly reads: FeedbackReadService,
  ) {}

  /** 409 template_not_approved, lesson_not_eligible or already_submitted; 503 not_configured. */
  @Route(routes.request)
  @HttpCode(200)
  request(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.request>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.requests.request({ lessonId: params.id, body, actorId: user.id });
  }

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>) {
    const { filter, page } = filterAndPage(query);
    return this.reads.list(filter, page);
  }

  @Route(routes.summary)
  summary() {
    return this.reads.summary();
  }

  /** A teacher's own rows and average; contact phone and guardian are never in them. */
  @Route(routes.mine)
  mine(@RouteInput() { query }: RouteInputOf<typeof routes.mine>, @CurrentUser() user: AuthUser) {
    return this.reads.mine(user, filterAndPage(query));
  }
}
