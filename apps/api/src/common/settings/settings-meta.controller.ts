import { settingsMetaRoutes as routes, type SettingsMetaResponse } from '@ab/settings';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { SettingsMetaRepo } from './settings-meta.repo';

/** Who last changed each stored setting and when (rows never written have no entry). */
@ApiBearerAuth()
@Controller()
export class SettingsMetaController {
  constructor(private readonly queries: SettingsMetaRepo) {}

  @Route(routes.view)
  async get(): Promise<SettingsMetaResponse> {
    return asResponse(routes.view.response, { meta: await this.queries.meta() });
  }
}
