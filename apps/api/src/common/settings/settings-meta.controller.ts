import type { SettingsMetaResponse } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { SettingsMetaRepo } from './settings-meta.repo';

/**
 * GET /config/meta: who last changed each stored setting and when (rows never written have no
 * entry). The route and its 'config' tag are legacy names kept on purpose.
 */
@ApiTags('config')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('config/meta')
export class SettingsMetaController {
  constructor(private readonly queries: SettingsMetaRepo) {}

  @Get()
  async get(): Promise<SettingsMetaResponse> {
    return { meta: await this.queries.meta() };
  }
}
