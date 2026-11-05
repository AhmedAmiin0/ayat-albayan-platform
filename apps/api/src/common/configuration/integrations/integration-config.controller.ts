import {
  INTEGRATION_SECRET_KEYS,
  integrationSecretCheck,
  integrationSecretSchema,
  integrationValuesSchema,
  type IntegrationConfigItem,
  type IntegrationPlainKey,
  type IntegrationSecretKey,
} from '@ab/shared';
import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '@/common/http/http';
import { ZodParam } from '@/common/http/zod-inputs';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { integrationKeyAvailable, stripeServerKey } from '@/config/env/env.stripe';
import { IntegrationConfigService, INTEGRATIONS_ENTITY_ID } from './integration-config.service';
import { lineSaved, savedLines } from './provider-saved';

// A key this server does not offer (a Stripe one without FEATURE_STRIPE) is an unknown key: 400.
const secretKey = z
  .enum(INTEGRATION_SECRET_KEYS)
  .refine((k) => integrationKeyAvailable(k), 'unknown_key');
const valuesBody = integrationValuesSchema.superRefine(({ values }, ctx) => {
  for (const key of Object.keys(values) as IntegrationPlainKey[]) {
    if (!integrationKeyAvailable(key))
      ctx.addIssue({ code: 'custom', path: ['values', key], message: 'unknown_key' });
  }
});
/** Where the server is stricter than the shared check (a live Stripe key: live mode only). */
const SERVER_SECRET_CHECKS: Partial<Record<IntegrationSecretKey, z.ZodType<string>>> = {
  STRIPE_API_KEY: stripeServerKey,
};
const secretCheck = (key: IntegrationSecretKey): z.ZodType<string> =>
  SERVER_SECRET_CHECKS[key] ?? integrationSecretCheck(key);

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
  async put(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<IntegrationConfigItem[]> {
    const { values } = parseOrThrow(valuesBody, body);
    await this.config.writeValues(values, user.id);
    await this.record(user, { action: 'update', keys: Object.keys(values) });
    // A line saved as meta syncs its templates once (docs/19 «CRM → Meta»), in the background.
    savedLines(values).forEach(lineSaved);
    return this.config.items();
  }

  /** A key's own format is checked too: a live Stripe key is 400 stripe_live_key_refused (test). */
  @Put('secrets/:key')
  @Permissions('settings.write')
  async putSecret(
    @ZodParam('key', secretKey) key: IntegrationSecretKey,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<IntegrationConfigItem[]> {
    const { value } = parseOrThrow(integrationSecretSchema, body);
    await this.config.setSecret({ key, value: parseOrThrow(secretCheck(key), value) });
    await this.record(user, { action: `secret_set:${key}`, keys: [key] });
    return this.config.items();
  }

  @Delete('secrets/:key')
  @Permissions('settings.write')
  async clearSecret(
    @ZodParam('key', secretKey) key: IntegrationSecretKey,
    @CurrentUser() user: AuthUser,
  ): Promise<IntegrationConfigItem[]> {
    if (await this.config.clearSecret(key))
      await this.record(user, { action: `secret_clear:${key}`, keys: [key] });
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
