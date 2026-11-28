import { Controller, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import { isAdmin } from '@/common/auth/roles';
import type { AuthUser } from '@/common/auth/verify-token';
import { ConfigStore } from '@/common/configuration/config-store/store/config-store.service';
import { asResponse } from '@/common/http/returns';
import { Route } from '@/common/http/route';
import { configParity } from './config-parity';
import { configParityRoutes as routes } from './config-parity.routes';
import type { ConfigParityResponse } from './config-parity.schemas';

/**
 * Run on staging and in CI on the e2e database; the read switch waits for ≥ 1 week of empty
 * `diffs` (docs/26 §4 «Parity»). Uncached rows, one select for both sides. Base admin only.
 */
@ApiBearerAuth()
@Controller()
export class ConfigParityController {
  constructor(private readonly store: ConfigStore) {}

  @Route(routes.parity)
  async get(@CurrentUser() user: AuthUser): Promise<ConfigParityResponse> {
    if (!isAdmin(user)) throw new ForbiddenException({ message: 'admin_only' });
    return asResponse(routes.parity.response, configParity((await this.store.fresh()).rows));
  }
}
