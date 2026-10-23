import { Global, Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { IntegrationConfigController } from './integration-config.controller';
import { IntegrationConfigQueries } from './integration-config.queries';
import { INTEGRATION_REFRESH_MS, IntegrationConfigService } from './integration-config.service';
import { integrationRefreshMs } from './integration-refresh';

/**
 * Global: loads the database's integration values into loadEnv()'s overlay before the rest of the
 * app starts (modules that read config at boot import it, so Nest initialises it first) and serves
 * the admin endpoints under /settings/integrations.
 */
@Global()
@Module({
  controllers: [IntegrationConfigController],
  providers: [
    {
      provide: INTEGRATION_REFRESH_MS,
      // INTEGRATION_REFRESH_MS, else SETTINGS_CACHE_MS; null = INTEGRATION_CONFIG_FROM_DB=false (env only).
      useFactory: (): number | null => integrationRefreshMs(loadEnv()),
    },
    IntegrationConfigQueries,
    IntegrationConfigService,
  ],
  exports: [IntegrationConfigService],
})
export class IntegrationConfigModule {}
