import { inboxSearchRoutes as routes, type MessageSearchPage } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { MessageSearchService } from './message-search.service';

/** docs/37: Fastify prefers the static segment over /threads/:phone (pinned by a test). */
@ApiBearerAuth()
@Controller()
export class MessageSearchController {
  constructor(private readonly searches: MessageSearchService) {}

  @Route(routes.messages)
  search(
    @RouteInput() { query }: RouteInputOf<typeof routes.messages>,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageSearchPage> {
    return this.searches.search(query, user);
  }
}
