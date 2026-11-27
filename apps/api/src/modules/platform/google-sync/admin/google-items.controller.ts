import {
  googleAdminRoutes as routes,
  type GoogleReconcile,
  type GoogleSyncItemView,
} from '@ab/catalog';
import { ConflictException, Controller, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { requireAdmin } from './admin-only';
import { GoogleItemsQueries } from '@/modules/platform/google-sync/sync/google-items.queries';
import { GoogleLogQueries } from './google-log.queries';
import { GoogleSyncJob } from '@/modules/platform/google-sync/sync/google-sync.job';

/** docs/24 §3. */
@ApiBearerAuth()
@Controller()
export class GoogleItemsController {
  constructor(
    private readonly log: GoogleLogQueries,
    private readonly items: GoogleItemsQueries,
    private readonly job: GoogleSyncJob,
  ) {}

  @Route(routes.items)
  async list(@CurrentUser() user: AuthUser): Promise<GoogleSyncItemView[]> {
    requireAdmin(user);
    return asResponse(routes.items.response, await this.log.recent(100));
  }

  @Route(routes.retry)
  async retry(
    @RouteInput() { params }: RouteInputOf<typeof routes.retry>,
    @CurrentUser() user: AuthUser,
  ): Promise<GoogleSyncItemView> {
    requireAdmin(user);
    if (!(await this.items.retry(params.id))) {
      throw new ConflictException({ message: 'not_retryable' });
    }
    void this.job.kick();
    const row = await this.log.one(params.id);
    if (!row) throw new NotFoundException();
    return asResponse(routes.retry.response, row);
  }

  @Route(routes.reconcile)
  async reconcile(@CurrentUser() user: AuthUser): Promise<GoogleReconcile> {
    requireAdmin(user);
    return { queued: await this.job.reconcile() };
  }
}
