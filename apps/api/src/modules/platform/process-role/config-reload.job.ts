import { Injectable, Logger, type OnApplicationBootstrap, type Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IntegrationConfigService } from '@/common/configuration/integrations/integration-config.service';
import { BackgroundJob } from '@/config/role/background-job';
import { DbRulesReader } from '@/modules/messaging/notification-rules';
import { NumbersConfig, OwnNumbers } from '@/modules/messaging/numbers';
import { GoogleConnection, GoogleSettings } from '@/modules/platform/google-sync';
import { TranslationsService } from '@/modules/platform/translations';

/**
 * The worker's and the other API copies' copy of the config an admin saves on one API copy (docs/09 «Known
 * windows»): that copy reloads its own at once, then kicks this on the worker (`reload`, gated) and on each
 * peer (`reloadHere`, PEER_URLS), so the sender, the reminders, the Google sync and the other copy never
 * keep a stale numbers overlay, own numbers, allow-list, rules snapshot, translations or Google connection
 * until their next refresh. Each step is looked up when it runs (strict: false, a test app may lack a module)
 * and a failed step never stops the next. Timers: none (wrap() needs the hook).
 */
@BackgroundJob({ name: 'config-reload', kick: 'reload' })
@Injectable()
export class ConfigReloadJob implements OnApplicationBootstrap {
  private readonly log = new Logger(ConfigReloadJob.name);

  constructor(private readonly refs: ModuleRef) {}

  onApplicationBootstrap(): void {}

  /** The worker's kick (in an `api` process @BackgroundJob sends it to the worker). */
  reload(): Promise<void> {
    return this.reloadHere();
  }

  /** This process's reload, whatever its role: the peer route (jobs.controller) calls it on an API copy. */
  async reloadHere(): Promise<void> {
    await this.step(IntegrationConfigService, (s) => s.reloadHere());
    // fresh() drops the shared settings cache too, so the numbers below read the new comms_source.
    await this.step(DbRulesReader, (s) => s.fresh());
    await this.step(NumbersConfig, (s) => s.reload());
    await this.step(OwnNumbers, (s) => s.forget());
    await this.step(GoogleSettings, (s) => s.forget());
    await this.step(GoogleConnection, (s) => s.forget());
    await this.step(TranslationsService, (s) => s.refresh());
  }

  private async step<T>(token: Type<T>, run: (service: T) => unknown): Promise<void> {
    try {
      await run(this.refs.get(token, { strict: false }));
    } catch (e) {
      this.log.warn(`config reload: ${token.name} skipped (${e instanceof Error ? e.message : String(e)})`);
    }
  }
}
