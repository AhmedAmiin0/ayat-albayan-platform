import { Injectable, Logger, type OnApplicationBootstrap, type Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IntegrationConfigService } from '../../../common/integrations/integration-config.service';
import { BackgroundJob } from '../../../config/role/background-job';
import { DbRulesReader } from '../../messaging/notification-rules';
import { NumbersConfig, OwnNumbers } from '../../messaging/numbers';
import { GoogleConnection, GoogleSettings } from '../google-sync';

/**
 * The worker's copy of the config an admin saves on an API copy (docs/09 «Known windows»): an API copy
 * reloads its own at once, then kicks this (kickConfigReload), so the sender, the reminders and the
 * Google sync never keep a stale numbers overlay, own numbers, allow-list, rules snapshot or Google connection until
 * their next refresh. Each step is looked up when it runs (strict: false, a test app may lack a module)
 * and a failed step never stops the next. Timers: none (wrap() needs the hook).
 */
@BackgroundJob({ name: 'config-reload', kick: 'reload' })
@Injectable()
export class ConfigReloadJob implements OnApplicationBootstrap {
  private readonly log = new Logger(ConfigReloadJob.name);

  constructor(private readonly refs: ModuleRef) {}

  onApplicationBootstrap(): void {}

  async reload(): Promise<void> {
    await this.step(IntegrationConfigService, (s) => s.reloadHere());
    // fresh() drops the shared settings cache too, so the numbers below read the new comms_source.
    await this.step(DbRulesReader, (s) => s.fresh());
    await this.step(NumbersConfig, (s) => s.reload());
    await this.step(OwnNumbers, (s) => s.forget());
    await this.step(GoogleSettings, (s) => s.forget());
    await this.step(GoogleConnection, (s) => s.forget());
  }

  private async step<T>(token: Type<T>, run: (service: T) => unknown): Promise<void> {
    try {
      await run(this.refs.get(token, { strict: false }));
    } catch (e) {
      this.log.warn(`config reload: ${token.name} skipped (${e instanceof Error ? e.message : String(e)})`);
    }
  }
}
