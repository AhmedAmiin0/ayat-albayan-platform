import { Injectable, Optional, type OnModuleInit } from '@nestjs/common';
import { CACHE_KEYS } from '../../cache/cache-keys';
import { SharedCache } from '../../cache/shared-cache';
import { ConfigStore } from './config-store.service';

/**
 * Settings across processes (owner 2026-10-27): a write here (ConfigStore.invalidate: config_set,
 * describe, the seeder, a switch) drops the shared rows and announces `settings`; an announcement from
 * another API copy or the worker drops this process's rows (and SettingsService's) at once. Without
 * Redis nothing is announced. Raw SQL writes are still seen by the revision check and the TTL.
 */
@Injectable()
export class ConfigCacheBridge implements OnModuleInit {
  constructor(
    private readonly store: ConfigStore,
    @Optional() private readonly shared?: SharedCache,
  ) {}

  onModuleInit(): void {
    const shared = this.shared;
    if (!shared) return;
    this.store.onChange((remote) => {
      if (!remote) void shared.invalidate({ topic: 'settings', keys: [CACHE_KEYS.settingsRows] });
    });
    shared.on('settings', () => this.store.dropLocal());
  }
}
