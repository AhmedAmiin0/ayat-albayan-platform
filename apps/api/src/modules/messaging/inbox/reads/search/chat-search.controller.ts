import { chatSearchQuerySchema, type ChatSearchQuery } from '@ab/shared';
import { phoneE164 } from '@ab/core';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ChatSearchService } from './chat-search.service';

/** Newest hit first, CHAT_SEARCH_PAGE per page; same permission and scope as reading the chat. */
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
