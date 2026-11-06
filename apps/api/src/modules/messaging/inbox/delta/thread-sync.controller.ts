import { threadSyncQuerySchema, type ThreadSync, type ThreadSyncQuery } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodQuery } from '@/common/http/zod-inputs';
import { ThreadSyncService } from './thread-sync.service';

/**
 * GET /threads/sync?since=<cursor>&limit=<n> (docs/43 §5, row 43-5): the phone store's delta of
 * every chat the caller may read. It sits beside GET /threads/:phone like /threads/search: Fastify
 * prefers the static segment (the HTTP test pins it).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads/sync')
export class ThreadSyncController {
  constructor(private readonly syncs: ThreadSyncService) {}

  @Get()
  sync(
    @ZodQuery(threadSyncQuerySchema) query: ThreadSyncQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadSync> {
    return this.syncs.sync(query, user);
  }
}
