import type { CommsSource } from '@ab/shared';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { integrationRefreshMs } from '../../../common/integrations/integration-refresh';
import { setNumbersOverlay, type NumbersOverlay, type OverlayNumber } from '../../../common/integrations/numbers-overlay';
import { loadEnv } from '../../../config/env/env';
import { overlayNumber } from './numbers.env';
import { moduleOverlay, type DefaultNumber } from '../lines/numbers.lines';
import { NumbersQueries } from '../numbers.queries';
import { NumbersSecrets } from './numbers.secrets';
import { NumbersSettings } from '../numbers.settings';

const MIN_REFRESH_MS = 1_000;

/**
 * NumbersConfig (docs/23 §2c): the port WhatsappModule's config comes through. comms_source = legacy
 * (the default, and whenever the setting is unknown) clears the numbers overlay, so loadEnv() and every
 * send are exactly today's. module: each role's default enabled number supplies that role's line keys
 * instead of the legacy WA_* ones, and every number rides along with its own credentials (phase 5
 * routing, docs/23c). Refreshed at boot (before WhatsappModule starts), on the integration
 * refresh period and after every numbers write (never when the database config is off). Never logs a value.
 */
@Injectable()
export class NumbersConfig implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(NumbersConfig.name);
  private timer: NodeJS.Timeout | null = null;
  private fromDb = false;
  private loaded = false;
  private generation = 0;

  constructor(
    private readonly settings: NumbersSettings,
    private readonly queries: NumbersQueries,
    private readonly secrets: NumbersSecrets,
  ) {}

  async onModuleInit(): Promise<void> {
    // INTEGRATION_CONFIG_FROM_DB=false (unit tests, env-only runs): never read; legacy.
    const everyMs = integrationRefreshMs(loadEnv());
    if (everyMs === null) return;
    this.fromDb = true;
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), Math.max(everyMs, MIN_REFRESH_MS)).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async source(): Promise<CommsSource> {
    return (await this.settings.read()).comms_source === 'module' ? 'module' : 'legacy';
  }

  /** After a numbers or source write: refresh(), unless the database config is off (docs/25 §7). */
  reload(): Promise<boolean> {
    return this.fromDb ? this.refresh() : Promise.resolve(true);
  }

  /**
   * Never throws. true = the overlay matches the stored source now. Only the latest call installs its
   * result (a slow interval load never overwrites a newer write's). A failed load keeps the current
   * state, except that module mode with nothing loaded yet (boot) fails closed: every line blank.
   */
  async refresh(): Promise<boolean> {
    const generation = ++this.generation;
    let source: CommsSource | null = null;
    try {
      source = await this.source();
      const next = source === 'module' ? await this.build() : null;
      if (generation === this.generation) this.install(next);
      return true;
    } catch (e) {
      if (source === 'module' && !this.loaded && generation === this.generation) setNumbersOverlay(this.overlayOf([]));
      this.log.warn(`numbers config not loaded, keeping the current one: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }

  private install(next: NumbersOverlay | null): void {
    setNumbersOverlay(next);
    this.loaded = true;
  }

  /** The module side as it would be now (parity reads it in legacy mode too). */
  async build(): Promise<NumbersOverlay> {
    const [defaults, numbers] = await Promise.all([this.defaults(), this.numbers()]);
    return { ...this.overlayOf(defaults), numbers };
  }

  /** Every wa_numbers row (enabled or not), each with ITS own Vault secrets only (docs/23c). */
  async numbers(): Promise<OverlayNumber[]> {
    const env = loadEnv();
    const rows = await this.queries.all();
    return Promise.all(rows.map(async (row) => overlayNumber({ row, secrets: await this.secrets.read(row.id) }, env)));
  }

  overlayOf(defaults: readonly DefaultNumber[]): NumbersOverlay {
    return moduleOverlay(defaults, (key) => this.log.warn(`number value for ${key} is invalid and ignored`));
  }

  async defaults(): Promise<(DefaultNumber & { label: string })[]> {
    const rows = await this.queries.defaults();
    return Promise.all(rows.map(async (r) => ({ ...r, secrets: await this.secrets.read(r.id) })));
  }
}
