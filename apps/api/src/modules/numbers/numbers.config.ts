import type { CommsSource } from '@ab/shared';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { integrationRefreshMs } from '../../common/integrations/integration-refresh';
import { setNumbersOverlay, type NumbersOverlay } from '../../common/integrations/numbers-overlay';
import { loadEnv } from '../../env';
import { moduleOverlay, type DefaultNumber } from './numbers.lines';
import { NumbersQueries } from './numbers.queries';
import { NumbersSecrets } from './numbers.secrets';
import { NumbersSettings } from './numbers.settings';

const MIN_REFRESH_MS = 1_000;

/**
 * NumbersConfig (docs/23 §2c): the port WhatsappModule's config comes through. comms_source = legacy
 * (the default, and whenever the setting is unknown) clears the numbers overlay, so loadEnv() and every
 * send are exactly today's. module: each role's default enabled number supplies that role's line keys
 * instead of the legacy WA_* ones. Refreshed at boot (before WhatsappModule starts), on the integration
 * refresh period and after every numbers write. A failed load keeps the current state. Never logs a value.
 */
@Injectable()
export class NumbersConfig implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(NumbersConfig.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly settings: NumbersSettings,
    private readonly queries: NumbersQueries,
    private readonly secrets: NumbersSecrets,
  ) {}

  async onModuleInit(): Promise<void> {
    // INTEGRATION_CONFIG_FROM_DB=false (unit tests, env-only runs): never read; legacy.
    const everyMs = integrationRefreshMs(loadEnv());
    if (everyMs === null) return;
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), Math.max(everyMs, MIN_REFRESH_MS)).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async source(): Promise<CommsSource> {
    return (await this.settings.read()).comms_source === 'module' ? 'module' : 'legacy';
  }

  /** Never throws. true = the overlay matches the stored source now. */
  async refresh(): Promise<boolean> {
    try {
      setNumbersOverlay((await this.source()) === 'module' ? await this.build() : null);
      return true;
    } catch (e) {
      this.log.warn(`numbers config not loaded, keeping the current one: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  /** The module side as it would be now (parity reads it in legacy mode too). */
  async build(): Promise<NumbersOverlay> {
    return this.overlayOf(await this.defaults());
  }

  overlayOf(defaults: readonly DefaultNumber[]): NumbersOverlay {
    return moduleOverlay(defaults, (key) => this.log.warn(`number value for ${key} is invalid and ignored`));
  }

  async defaults(): Promise<(DefaultNumber & { label: string })[]> {
    const rows = await this.queries.defaults();
    return Promise.all(rows.map(async (r) => ({ ...r, secrets: await this.secrets.read(r.id) })));
  }
}
