import { Injectable, Optional } from '@nestjs/common';
import { CACHE_KEYS } from '../../cache/cache-keys';
import { SharedCache } from '../../cache/shared-cache';
import { ConfigStore } from './config-store.service';

/**
 * Settings across processes (owner 2026-10-27): a write here (ConfigStore.invalidate: config_set,
 * describe, the seeder, a switch) drops the shared rows and announces `settings`; an announcement from
 * another API copy or the worker drops this process's rows (and SettingsService's) at once. Registered
 * in the constructor, so before any onModuleInit subscriber of `settings` (NumbersEffects reloads the
 * line config from SettingsService: it must see the new comms_source). Without Redis nothing is
 * announced. A raw SQL write is not announced: ConfigStore sees it by its revision check (2 s),
 * SettingsService within SETTINGS_CACHE_MS of its database read (a copy taken from the shared rows,
 * kept there for half of it, lives only what is left of it).
 */
@Injectable()
export class ConfigCacheBridge {
  constructor(store: ConfigStore, @Optional() shared?: SharedCache) {
    if (!shared) return;
    store.onChange((remote) => {
      if (!remote) void shared.invalidate({ topic: 'settings', keys: [CACHE_KEYS.settingsRows] });
    });
    shared.on('settings', () => store.dropLocal());
  }
}
