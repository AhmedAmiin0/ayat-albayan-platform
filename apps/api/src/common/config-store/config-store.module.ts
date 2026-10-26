import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../config/env/env';
import { ConfigEntriesAudit } from './io/config-entries.audit';
import { ConfigEntriesController } from './io/config-entries.controller';
import { ConfigEntriesService } from './io/config-entries.service';
import { ConfigParityController } from './boundaries/config-parity';
import { ConfigSeeder } from './boundaries/config-seeder';
import { ConfigStoreQueries } from './store/config-store.queries';
import { ConfigStore } from './store/config-store.service';
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
