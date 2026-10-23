import { NUMBER_SECRET_NAMES, type NumberSecretName } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';

export interface SecretTarget {
  id: string;
  name: NumberSecretName;
}
export type SecretStatus = ReadonlyMap<string, Partial<Record<NumberSecretName, string>>>;

const isName = (n: string): n is NumberSecretName => NUMBER_SECRET_NAMES.some((k) => k === n);

/**
 * Per-number credentials in Vault (migration 20261023000621): wa_number:<id>:access_token / :app_secret.
 * No method logs a value; only read() returns one, for the in-memory line config (NumbersConfig).
 */
@Injectable()
export class NumbersSecrets {
  constructor(@Inject(DB) private readonly db: Db) {}

  async set(target: SecretTarget, value: string): Promise<void> {
    const { error } = await this.db.rpc('wa_number_secret_set', { p_id: target.id, p_name: target.name, p_value: value });
    if (error) throw new Error(`number secret ${target.name} not saved: ${error.code ?? 'error'}`);
  }

  async clear(target: SecretTarget): Promise<boolean> {
    const { data, error } = await this.db.rpc('wa_number_secret_clear', { p_id: target.id, p_name: target.name });
    if (error) throw new Error(`number secret ${target.name} not cleared: ${error.code ?? 'error'}`);
    return data === true;
  }

  /** The import: legacy Vault secret `key` → this number, inside the database. false = no legacy secret. */
  async copy(target: SecretTarget, key: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('wa_number_secret_copy', { p_id: target.id, p_name: target.name, p_key: key });
    if (error) throw new Error(`number secret ${target.name} not copied: ${error.code ?? 'error'}`);
    return data === true;
  }

  /** number id → secret name → when it was set (no values). */
  async status(): Promise<SecretStatus> {
    const { data, error } = await this.db.rpc('wa_number_secret_status');
    if (error) throw new Error(`number secrets status failed: ${error.code ?? 'error'}`);
    const out = new Map<string, Partial<Record<NumberSecretName, string>>>();
    for (const r of data) {
      if (isName(r.name)) out.set(r.number_id, { ...out.get(r.number_id), [r.name]: r.updated_at });
    }
    return out;
  }

  /** The decrypted values of one number (service role). Never log the result. */
  async read(id: string): Promise<Partial<Record<NumberSecretName, string>>> {
    const { data, error } = await this.db.rpc('wa_number_secret_read', { p_id: id });
    if (error) throw new Error(`number secrets read failed: ${error.code ?? 'error'}`);
    return Object.fromEntries(data.filter((r) => isName(r.name)).map((r) => [r.name, r.value]));
  }
}
