import { messageSearchQuerySchema, type MessageSearchQuery } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodQuery } from '@/common/http/zod-inputs';
import { MessageSearchService } from './message-search.service';

/**
 * GET /threads/search?q=&cursor= (owner 2026-11-06, docs/37): the chats list's «الرسائل» section,
 * every chat the caller may read, newest hit first, MESSAGE_SEARCH_PAGE a page, no total. It sits
 * beside GET /threads/:phone like /threads/stickers: Fastify prefers the static segment (the HTTP
 * test pins it).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads/search')
export class MessageSearchController {
  constructor(private readonly searches: MessageSearchService) {}

  @Get()
  search(
    @ZodQuery(messageSearchQuerySchema) query: MessageSearchQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.searches.search(query, user);
  }
}
