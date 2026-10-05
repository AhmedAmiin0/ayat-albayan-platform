import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { ConfigAdminController } from '../config/config.admin.controller';
import { ConfigAdminQueries } from '../config/config-admin.queries';
import { ConfigPublicController } from '../config/config.public.controller';
import { PublicConfigService } from '../config/config.public.service';
import { CustomConfigController } from '../config/custom-config.controller';
import { CustomConfigService } from '../config/custom-config.service';
import { SettingsController } from './settings.controller';
import { SettingsPublicController } from './settings.public.controller';
import { SETTINGS_CACHE_MS, SettingsService } from './settings.service';

/**
 * Global: every module reads settings through SettingsService; admins edit them over HTTP. Also
 * hosts the config endpoints: public GET /config, admin GET /config/meta and /config/custom.
 */
@Global()
@Module({
  controllers: [SettingsPublicController, SettingsController, ConfigPublicController, ConfigAdminController, CustomConfigController],
  providers: [
    { provide: SETTINGS_CACHE_MS, useFactory: (): number => loadEnv().SETTINGS_CACHE_MS },
    SettingsService,
    PublicConfigService,
    ConfigAdminQueries,
    CustomConfigService,
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
