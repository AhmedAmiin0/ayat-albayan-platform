import { Global, Module } from '@nestjs/common';
import { SettingsMetaController } from './settings-meta.controller';
import { SettingsMetaQueries } from './settings-meta.queries';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * The academy settings (`settings` table, keys in the shared registry). Global: every module reads
 * them through SettingsService (cached for SETTINGS_CACHE_MS, which the global ConfigStoreModule
 * provides; writes go through its ConfigStore). Admins read and edit them over GET/PATCH /settings,
 * and see who last changed each row over GET /config/meta. The custom entries (CustomConfigModule)
 * and GET /settings/public (PublicConfigModule) live in their own modules.
 */
@Global()
@Module({
  controllers: [SettingsController, SettingsMetaController],
  providers: [SettingsService, SettingsMetaQueries],
  exports: [SettingsService],
})
export class SettingsModule {}
