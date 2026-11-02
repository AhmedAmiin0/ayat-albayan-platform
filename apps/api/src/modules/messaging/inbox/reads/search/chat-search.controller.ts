import { chatSearchQuerySchema, phoneE164, type ChatSearchQuery } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ChatSearchService } from './chat-search.service';

/**
 * GET /threads/:phone/search?q=&cursor= (owner 2026-11-02): «بحث» inside one chat, newest hit
 * first, CHAT_SEARCH_PAGE a page. Same permission and scope as reading the chat.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads/:phone/search')
export class ChatSearchController {
  constructor(private readonly searches: ChatSearchService) {}

  @Get()
  search(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @ZodQuery(chatSearchQuerySchema) query: ChatSearchQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.searches.search(phone, query, user);
  }
}
