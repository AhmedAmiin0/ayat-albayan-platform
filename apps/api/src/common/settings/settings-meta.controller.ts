import type { SettingsMetaResponse } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators';
import { SettingsMetaQueries } from './settings-meta.queries';

/**
 * GET /config/meta: who last changed each stored setting and when (rows never written have no
 * entry). The route and its 'config' tag are legacy names kept on purpose.
 */
@ApiTags('config')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('config/meta')
export class SettingsMetaController {
  constructor(private readonly queries: SettingsMetaQueries) {}

  @Get()
  async get(): Promise<SettingsMetaResponse> {
    return { meta: await this.queries.meta() };
  }
}
