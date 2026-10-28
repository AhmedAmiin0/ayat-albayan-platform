import { isStripeTestKey, isWebhookSecret, maskSecret, type StripeAdminSettings, type StripeSettingsPatch } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { badRequest } from '../../../../common/http/errors';
import { StripeSettingsQueries, type StripeSecretName } from '../gate/stripe-settings.queries';

/** audit_log.entity_id of the Stripe settings (one entity; the audit rows never carry a secret). */
const ENTITY_ID = '00000000-0000-0000-0000-000000000000';
/** What the audit row says about a secret: never its value. */
const secretChange = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? 'cleared' : 'set');

/**
 * «الدفع الإلكتروني (اختبار)» (docs/30): the switch, the cap, and the two write-only secrets. A live key is
 * refused (400 stripe_live_key_refused): the test build takes sandbox keys only. Reads mask the secrets.
 */
@Injectable()
export class StripeAdmin {
  constructor(
    private readonly settings: StripeSettingsQueries,
    private readonly audit: AuditService,
  ) {}

  async view(webhookUrl: string): Promise<StripeAdminSettings> {
    const [row, dates, key, secret] = await Promise.all([
      this.settings.read(),
      this.settings.secretDates(),
      this.settings.secret('api_key'),
      this.settings.secret('webhook_secret'),
    ]);
    const state = (name: StripeSecretName, value: string | null) => ({
      set: value !== null,
      masked: value === null ? null : maskSecret(value),
      updated_at: dates.get(name) ?? null,
    });
    return {
      enabled: row.stripe_enabled,
      max_discount_pct: row.max_discount_pct,
      api_key: state('api_key', key),
      webhook_secret: state('webhook_secret', secret),
      webhook_url: webhookUrl,
    };
  }

  async patch(input: StripeSettingsPatch, actorId: string): Promise<void> {
    if (typeof input.apiKey === 'string' && !isStripeTestKey(input.apiKey)) throw badRequest('stripe_live_key_refused');
    if (typeof input.webhookSecret === 'string' && !isWebhookSecret(input.webhookSecret)) throw badRequest('invalid_secret');
    await this.secret('api_key', input.apiKey);
    await this.secret('webhook_secret', input.webhookSecret);
    const row = {
      ...(input.enabled === undefined ? {} : { stripe_enabled: input.enabled }),
      ...(input.maxDiscountPct === undefined ? {} : { max_discount_pct: input.maxDiscountPct }),
    };
    if (Object.keys(row).length > 0) await this.settings.write(row, actorId);
    const after = { ...row, api_key: secretChange(input.apiKey), webhook_secret: secretChange(input.webhookSecret) };
    await this.audit.record({ actorId, entity: 'stripe_settings', entityId: ENTITY_ID, action: 'update', after });
  }

  private async secret(name: StripeSecretName, value: string | null | undefined): Promise<void> {
    if (value === null) await this.settings.clearSecret(name);
    else if (value !== undefined) await this.settings.setSecret(name, value.trim());
  }
}
