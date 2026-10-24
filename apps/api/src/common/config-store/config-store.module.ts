import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { ConfigEntriesAudit } from './config-entries.audit';
import { ConfigEntriesController } from './config-entries.controller';
import { ConfigEntriesService } from './config-entries.service';
import { ConfigParityController } from './config-parity';
import { ConfigSeeder } from './config-seeder';
import { ConfigStoreQueries } from './config-store.queries';
import { ConfigStore } from './config-store.service';
import { SETTINGS_CACHE_MS } from './config-store.types';

/**
 * The settings store (docs/26 §2e): rows + cache + revision (ConfigStore), the boot seeder, «القيم»
 * (/config/entries) and the read-path parity check. Global: SettingsService (the same token as
 * before, a facade) writes through it. It imports no consumer module.
 */
@Global()
@Module({
  controllers: [ConfigEntriesController, ConfigParityController],
  providers: [
    { provide: SETTINGS_CACHE_MS, useFactory: (): number => loadEnv().SETTINGS_CACHE_MS },
    ConfigStoreQueries,
    ConfigStore,
    ConfigSeeder,
    ConfigEntriesAudit,
    ConfigEntriesService,
  ],
  exports: [ConfigStore, SETTINGS_CACHE_MS],
})
export class ConfigStoreModule {}
