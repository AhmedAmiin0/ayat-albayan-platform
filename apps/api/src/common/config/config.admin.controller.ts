import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { ConfigAdminQueries, type SettingMeta } from './config-admin.queries';

/** GET /config/meta: who last changed each stored setting and when (rows never written have no entry). */
@ApiTags('config')
@ApiBearerAuth()
@Roles('admin')
@Controller('config/meta')
export class ConfigAdminController {
  constructor(private readonly queries: ConfigAdminQueries) {}

  @Get()
  async get(): Promise<{ meta: Record<string, SettingMeta> }> {
    return { meta: await this.queries.meta() };
  }
}
