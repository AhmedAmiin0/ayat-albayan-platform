import { Injectable, Logger, type Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IntegrationConfigService } from '../../../../common/integrations/integration-config.service';
import { NumbersConfig } from '../../numbers';

/** At most one reload per this gap: a stream of webhooks for a foreign number never hammers the database. */
export const RELOAD_GAP_MS = 5_000;

/**
 * A webhook for a phone_number_id this copy does not know (docs/09 «Known windows»): a number or an
 * integration save taken by the other API copy reaches this one only on its refresh (60 s), so before
 * ignoring it the integration overlay and the numbers config are reloaded once and the body parsed
 * again. Concurrent callers share the one reload. Never throws (a failed step keeps the current config).
 */
@Injectable()
export class WebhookConfigReload {
  private readonly log = new Logger(WebhookConfigReload.name);
  private running: Promise<void> | null = null;
  private last = Number.NEGATIVE_INFINITY;

  constructor(private readonly refs: ModuleRef) {}

  /** true = the config was just reloaded for this caller (parse again); false = it is fresh already. */
  async once(now: number = Date.now()): Promise<boolean> {
    if (this.running) {
      await this.running;
      return true;
    }
    if (now - this.last < RELOAD_GAP_MS) return false;
    this.last = now;
    this.running = this.reload().finally(() => {
      this.running = null;
    });
    await this.running;
    return true;
  }

  private async reload(): Promise<void> {
    await this.step(IntegrationConfigService, (s) => s.reloadHere());
    await this.step(NumbersConfig, (s) => s.reload());
  }

  private async step<T>(token: Type<T>, run: (service: T) => Promise<unknown>): Promise<void> {
    try {
      await run(this.refs.get(token, { strict: false }));
    } catch (e) {
      this.log.warn(`webhook config reload: ${token.name} skipped (${e instanceof Error ? e.message : String(e)})`);
    }
  }
}
