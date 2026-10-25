import { INTEGRATION_SECRET_KEYS, integrationSecretSchema, integrationValuesSchema, type IntegrationConfigItem } from '@ab/shared';
import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '../http/http';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, Permissions } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { IntegrationConfigService } from './integration-config.service';

/** audit_log.entity_id of the integration config (one entity; the key names go in action / after). */
const INTEGRATIONS_ENTITY_ID = '00000000-0000-0000-0000-000000000000';
const secretKey = z.enum(INTEGRATION_SECRET_KEYS);

/**
 * «التكاملات» on /admin/settings (owner, 2026-10-12): the integration keys an admin may keep in the
 * database instead of the server env. Secrets go to Vault and are write-only: no response, log or
 * audit row ever carries a secret value (audit rows hold key names only).
 */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('settings/integrations')
export class IntegrationConfigController {
  constructor(
    private readonly config: IntegrationConfigService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(): Promise<IntegrationConfigItem[]> {
    return this.config.items();
  }

  /** Plain keys only; null or blank clears a key (the env value applies again). 400 names the key. */
  @Put()
  @Permissions('settings.write')
  async put(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<IntegrationConfigItem[]> {
    const { values } = parseOrThrow(integrationValuesSchema, body);
    await this.config.writeValues(values, user.id);
    await this.record(user, { action: 'update', keys: Object.keys(values) });
    return this.config.items();
  }

  @Put('secrets/:key')
  @Permissions('settings.write')
  async putSecret(@Param('key') rawKey: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<IntegrationConfigItem[]> {
    const key = parseOrThrow(secretKey, rawKey);
    const { value } = parseOrThrow(integrationSecretSchema, body);
    await this.config.setSecret({ key, value });
    await this.record(user, { action: `secret_set:${key}`, keys: [key] });
    return this.config.items();
  }

  @Delete('secrets/:key')
  @Permissions('settings.write')
  async clearSecret(@Param('key') rawKey: string, @CurrentUser() user: AuthUser): Promise<IntegrationConfigItem[]> {
    const key = parseOrThrow(secretKey, rawKey);
    if (await this.config.clearSecret(key)) await this.record(user, { action: `secret_clear:${key}`, keys: [key] });
    return this.config.items();
  }

  private record(user: AuthUser, what: { action: string; keys: string[] }): Promise<void> {
    return this.audit.record({
      actorId: user.id,
      entity: 'integration_config',
      entityId: INTEGRATIONS_ENTITY_ID,
      action: what.action,
      before: null,
      after: { keys: what.keys },
    });
  }
}
