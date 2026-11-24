import { messageSearchQuerySchema, type MessageSearchQuery } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodQuery } from '@/common/http/zod-inputs';
import { MessageSearchService } from './message-search.service';

/** docs/37: Fastify prefers the static segment over /threads/:phone (pinned by a test). */
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
