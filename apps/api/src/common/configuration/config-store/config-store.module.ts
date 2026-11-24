import { Global, Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { ConfigEntriesAudit } from './io/config-entries.audit';
import { ConfigEntriesController } from './io/config-entries.controller';
import { ConfigEntriesService } from './io/config-entries.service';
import { ConfigParityController } from './boundaries/config-parity';
import { ConfigSeeder } from './boundaries/config-seeder';
import { ConfigCacheBridge } from './store/config-cache.bridge';
import { ConfigStoreRepo } from './store/config-store.repo';
import { ConfigStore } from './store/config-store.service';
import { SETTINGS_CACHE_MS } from './config-store.types';

/** Global so SettingsService writes through it (docs/26 §2e); imports no consumer module. */
@Global()
@Module({
  controllers: [ConfigEntriesController, ConfigParityController],
  providers: [
    { provide: SETTINGS_CACHE_MS, useFactory: (): number => loadEnv().SETTINGS_CACHE_MS },
    ConfigStoreRepo,
    ConfigStore,
    ConfigCacheBridge,
    ConfigSeeder,
    ConfigEntriesAudit,
    ConfigEntriesService,
  ],
  exports: [ConfigStore, SETTINGS_CACHE_MS],
})
export class ConfigStoreModule {}
