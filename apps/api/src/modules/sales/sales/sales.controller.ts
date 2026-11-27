import { salesPortalRoutes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesService } from './sales.service';

type Input<K extends keyof typeof salesPortalRoutes> = RouteInputOf<(typeof salesPortalRoutes)[K]>;

@ApiBearerAuth()
@Controller()
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Route(salesPortalRoutes.subscriptions)
  async subscriptions(
    @RouteInput() { query }: Input<'subscriptions'>,
    @CurrentUser() user: AuthUser,
  ) {
    const rows = await this.sales.subscriptions(user, query.kind);
    return asResponse(salesPortalRoutes.subscriptions.response, rows);
  }

  @Route(salesPortalRoutes.meetings)
  async meetings(@RouteInput() { query }: Input<'meetings'>, @CurrentUser() user: AuthUser) {
    return asResponse(salesPortalRoutes.meetings.response, await this.sales.meetings(user, query));
  }
}
