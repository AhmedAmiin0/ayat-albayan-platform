import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

export type StripeSecretName = 'api_key' | 'webhook_secret';
interface StripeSettingsRow {
  stripe_enabled: boolean;
  max_discount_pct: number | null;
}
const OFF: StripeSettingsRow = { stripe_enabled: false, max_discount_pct: null };

/**
 * stripe_settings (one row) and the Vault functions of migration 20261028000941, with the service role.
 * Error messages carry Postgres' text only, never a secret value.
 */
@Injectable()
export class StripeSettingsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** A missing row reads as OFF. */
  async read(): Promise<StripeSettingsRow> {
    const { data, error } = await this.db.from('stripe_settings').select('stripe_enabled, max_discount_pct').eq('id', true).maybeSingle();
    if (error) throw new Error(`stripe_settings read failed: ${error.message}`);
    return data ?? OFF;
  }

  async write(patch: Partial<StripeSettingsRow>, actorId: string): Promise<void> {
    const { error } = await this.db.from('stripe_settings').upsert({ id: true, ...patch, updated_by: actorId, updated_at: new Date().toISOString() });
    if (error) throw new Error(`stripe_settings write failed: ${error.message}`);
  }

  async secret(name: StripeSecretName): Promise<string | null> {
    const { data, error } = await this.db.rpc('stripe_secret_read', { p_name: name });
    if (error) throw new Error(`stripe secret read failed for ${name}: ${error.message}`);
    return data || null;
  }

  /** The DB refuses a live key too (22023 stripe_live_key_refused). */
  async setSecret(name: StripeSecretName, value: string): Promise<void> {
    const { error } = await this.db.rpc('stripe_secret_set', { p_name: name, p_value: value });
    if (error) throw new Error(`stripe secret write failed for ${name}: ${error.message}`);
  }

  async clearSecret(name: StripeSecretName): Promise<void> {
    const { error } = await this.db.rpc('stripe_secret_clear', { p_name: name });
    if (error) throw new Error(`stripe secret clear failed for ${name}: ${error.message}`);
  }

  async secretDates(): Promise<Map<string, string>> {
    const { data, error } = await this.db.rpc('stripe_secrets_status');
    if (error) throw new Error(`stripe secrets status failed: ${error.message}`);
    return new Map(data.map((r) => [r.name, r.updated_at]));
  }
}
