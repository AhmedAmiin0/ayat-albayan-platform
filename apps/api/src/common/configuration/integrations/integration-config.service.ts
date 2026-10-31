import type { IntegrationConfigItem, IntegrationPlainKey, IntegrationSecretKey } from '@ab/shared';
import { Inject, Injectable, Logger, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { SharedCache } from '@/common/infra/cache/shared-cache';
import { setIntegrationOverlay } from './integration-overlay';
import { validOverlay } from '@/config/env/env';
import { kickConfigReload } from '@/config/role/worker-kick';
import { IntegrationConfigRepo } from './integration-config.repo';
import { integrationItems } from './integration-config.view';

/** Injection token of the refresh period in ms (integrationRefreshMs; 0 = every second; null = off). */
export const INTEGRATION_REFRESH_MS = Symbol('INTEGRATION_REFRESH_MS');
const MIN_REFRESH_MS = 1_000;
/** A slow database never holds the boot longer than this. */
const LOAD_TIMEOUT_MS = 5_000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms).unref());
}

/**
 * Integration config in the database (owner, 2026-10-12). Loads the DB values into the overlay
 * that loadEnv() lays over process.env: once in onModuleInit (awaited, so it is in place before
 * any onApplicationBootstrap and before the first request), every refresh period and right after
 * an admin write. A failed load never blocks the boot: it logs and keeps the last good snapshot
 * (env only until the first good load). Logs carry key names only, never a value. With Redis an admin
 * write announces `integrations` and the other API copies and the worker reload at once; the values
 * themselves (Vault secrets among them) are never put in the shared cache.
 */
@Injectable()
export class IntegrationConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(IntegrationConfigService.name);
  private timer: NodeJS.Timeout | null = null;
  private badKeys: ReadonlySet<string> = new Set();

  constructor(
    private readonly queries: IntegrationConfigRepo,
    @Inject(INTEGRATION_REFRESH_MS) private readonly everyMs: number | null,
    @Optional() private readonly shared?: SharedCache,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.everyMs === null) return;
    this.shared?.on('integrations', () => void this.refresh());
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), Math.max(this.everyMs, MIN_REFRESH_MS)).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Never throws. true = the overlay now holds the database's values. */
  async refresh(): Promise<boolean> {
    try {
      const raw = await Promise.race([this.queries.rawValues(), timeout(LOAD_TIMEOUT_MS)]);
      const bad: string[] = [];
      setIntegrationOverlay(validOverlay(raw, (key) => bad.push(key)));
      // One warning per bad key, not one per refresh.
      for (const key of bad) {
        if (!this.badKeys.has(key)) this.log.warn(`integration config ${key}: invalid value in the database ignored, the env value applies`);
      }
      this.badKeys = new Set(bad);
      return true;
    } catch (e) {
      this.log.warn(`integration config not loaded, keeping the current values: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  /** GET /settings/integrations. */
  async items(): Promise<IntegrationConfigItem[]> {
    const [plain, secrets] = await Promise.all([this.queries.plainRows(), this.queries.secretStatus()]);
    return integrationItems({ plain, secrets, env: process.env });
  }

  /** Reload unless the database's config is switched off (also the worker's config-reload kick). */
  async reloadHere(): Promise<void> {
    if (this.everyMs !== null) await this.refresh();
  }

  /** After an admin write: here, then the worker's copy (kickConfigReload) and, with Redis, every other process. */
  private async reload(): Promise<void> {
    await this.reloadHere();
    kickConfigReload();
    if (this.everyMs !== null) await this.shared?.invalidate({ topic: 'integrations' });
  }

  async writeValues(values: Partial<Record<IntegrationPlainKey, string | null>>, actorId: string): Promise<void> {
    try {
      await this.queries.writePlain(values, actorId);
    } finally {
      await this.reload();
    }
  }

  async setSecret(input: { key: IntegrationSecretKey; value: string }): Promise<void> {
    try {
      await this.queries.setSecret(input);
    } finally {
      await this.reload();
    }
  }

  async clearSecret(key: IntegrationSecretKey): Promise<boolean> {
    try {
      return await this.queries.clearSecret(key);
    } finally {
      await this.reload();
    }
  }
}
