import { inboxSearchRoutes as routes, type ChatSearchPage } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ChatSearchService } from './chat-search.service';

/** Newest hit first, CHAT_SEARCH_PAGE per page; same permission and scope as reading the chat. */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller()
export class ChatSearchController {
  constructor(private readonly searches: ChatSearchService) {}

  @Route(routes.chat)
  search(
    @RouteInput({ badParam: invalidPhone }) { params, query }: RouteInputOf<typeof routes.chat>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChatSearchPage> {
    return this.searches.search(params.phone, query, user);
  }
}
