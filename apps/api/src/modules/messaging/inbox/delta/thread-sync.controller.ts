import { threadReadRoutes as routes, type ThreadSync } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ThreadSyncService } from './thread-sync.service';

/**
 * The phone store's delta of every chat the caller may read (docs/43 §5, row 43-5). It sits
 * beside GET /threads/:phone like /threads/search: Fastify prefers the static segment (the HTTP
 * test pins it).
 */
@ApiBearerAuth()
@Controller()
export class ThreadSyncController {
  constructor(private readonly syncs: ThreadSyncService) {}

  @Route(routes.sync)
  sync(
    @RouteInput() { query }: RouteInputOf<typeof routes.sync>,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadSync> {
    return this.syncs.sync(query, user);
  }
}
