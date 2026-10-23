import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { ConfigAdminController } from '../config/config.admin.controller';
import { ConfigAdminQueries } from '../config/config-admin.queries';
import { SettingsController } from './settings.controller';
import { SETTINGS_CACHE_MS, SettingsService } from './settings.service';

/**
 * Global: every module reads settings through SettingsService; admins edit them over HTTP. Also
 * hosts the admin GET /config/meta.
 */
@Global()
@Module({
  controllers: [SettingsController, ConfigAdminController],
  providers: [
    { provide: SETTINGS_CACHE_MS, useFactory: (): number => loadEnv().SETTINGS_CACHE_MS },
    SettingsService,
    ConfigAdminQueries,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
