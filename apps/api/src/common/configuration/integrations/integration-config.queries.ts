import { isIntegrationPlainKey, isIntegrationSecretKey, type IntegrationPlainKey, type IntegrationSecretKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** A plain row as the admin view needs it. */
export interface PlainRow {
  key: string;
  value: string;
  updated_at: string;
}
/** A Vault secret's status: never its value. */
export interface SecretStatus {
  key: string;
  updated_at: string;
}

/**
 * integration_config (plain values) and the Vault functions of migration 20261012000310, with the
 * service role. Error messages carry Postgres' text only, never a value.
 */
@Injectable()
export class IntegrationConfigQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every DB value of a registry key (plain from the table, secret from Vault), for the overlay. */
  async rawValues(): Promise<Record<string, string>> {
    const [plain, secrets] = await Promise.all([this.plainRows(), this.db.rpc('integration_secrets_read')]);
    if (secrets.error) throw new Error(`integration secrets read failed: ${secrets.error.message}`);
    const out: Record<string, string> = {};
    for (const r of plain) if (isIntegrationPlainKey(r.key)) out[r.key] = r.value;
    for (const r of secrets.data) if (isIntegrationSecretKey(r.key)) out[r.key] = r.value;
    return out;
  }

  async plainRows(): Promise<PlainRow[]> {
    const { data, error } = await this.db.from('integration_config').select('key, value, updated_at');
    if (error) throw new Error(`integration_config read failed: ${error.message}`);
    return data;
  }

  async secretStatus(): Promise<SecretStatus[]> {
    const { data, error } = await this.db.rpc('integration_secrets_status');
    if (error) throw new Error(`integration secrets status failed: ${error.message}`);
    return data;
  }

  /** null deletes the row (the env value applies again). actorId null = the import command. */
  async writePlain(values: Partial<Record<IntegrationPlainKey, string | null>>, actorId: string | null): Promise<void> {
    for (const [key, value] of Object.entries(values)) {
      const { error } =
        value === null || value === undefined
          ? await this.db.from('integration_config').delete().eq('key', key)
          : await this.db.from('integration_config').upsert({ key, value, updated_by: actorId });
      if (error) throw new Error(`integration_config write failed for ${key}: ${error.message}`);
    }
  }

  async setSecret(input: { key: IntegrationSecretKey; value: string }): Promise<void> {
    const { error } = await this.db.rpc('integration_secret_set', { p_key: input.key, p_value: input.value });
    if (error) throw new Error(`integration secret write failed for ${input.key}: ${error.message}`);
  }

  /** false when there was no such secret. */
  async clearSecret(key: IntegrationSecretKey): Promise<boolean> {
    const { data, error } = await this.db.rpc('integration_secret_clear', { p_key: key });
    if (error) throw new Error(`integration secret clear failed for ${key}: ${error.message}`);
    return data;
  }
}
