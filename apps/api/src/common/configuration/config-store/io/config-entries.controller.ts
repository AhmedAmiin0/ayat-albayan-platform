import {
  configEntriesRoutes as routes,
  type ConfigEntriesResponse,
  type ConfigEntryResult,
} from '@ab/settings';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ConfigEntriesService } from './config-entries.service';

/** Settings values (docs/26 §2f): per-key versioned saves; Google rows are base-admin only. */
@ApiBearerAuth()
@Controller()
export class ConfigEntriesController {
  constructor(private readonly entries: ConfigEntriesService) {}

  @Route(routes.list)
  async list(@CurrentUser() user: AuthUser): Promise<ConfigEntriesResponse> {
    return asResponse(routes.list.response, { entries: await this.entries.list(user) });
  }

  @Route(routes.patch)
  update(
    @RouteInput() { params: { key }, body }: RouteInputOf<typeof routes.patch>,
    @CurrentUser() user: AuthUser,
  ): Promise<ConfigEntryResult> {
    return this.entries.patch({ key, body, user });
  }

  /** Audited `describe:<key>`; a null text also drops the ar translation override. */
  @Route(routes.describe)
  describe(
    @RouteInput() { params: { key }, body }: RouteInputOf<typeof routes.describe>,
    @CurrentUser() user: AuthUser,
  ): Promise<ConfigEntryResult> {
    return this.entries.describe({ key, body, user });
  }
}
