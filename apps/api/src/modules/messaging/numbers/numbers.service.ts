import type { Json } from '@ab/db';
import type { NumberCreate, NumberSecretName, NumberUpdate, NumberView } from '@ab/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { numberView } from './numbers.mapper';
import { NumbersEffects } from './numbers.effects';
import { numberPatch } from './numbers.patch';
import { NumbersQueries, type NumberRow } from './numbers.queries';
import { NumbersSecrets } from './config/numbers.secrets';

/** What the audit keeps of a number: no health, no secret (secrets are not on the row anyway). */
function audited(row: NumberRow | null): Json {
  if (!row) return null;
  const { id, label, purpose, provider, phone_number_id, waba_id, app_id, enabled, is_default } = row;
  return { id, label, purpose, provider, phone_number_id, waba_id, app_id, enabled, is_default };
}

const missing = (): never => {
  throw new NotFoundException({ message: 'number_not_found' });
};

/**
 * «الأرقام» (docs/23 §3 phase 3): numbers as records. Writes go through the service role only; each is
 * audited and refreshes NumbersConfig. Nothing here reads or writes a sending switch.
 */
@Injectable()
export class NumbersService {
  constructor(
    private readonly queries: NumbersQueries,
    private readonly secrets: NumbersSecrets,
    private readonly effects: NumbersEffects,
  ) {}

  async list(): Promise<NumberView[]> {
    const [rows, status] = await Promise.all([this.queries.all(), this.secrets.status()]);
    return rows.map((r) => numberView(r, status));
  }

  private async view(id: string): Promise<NumberView> {
    const row = (await this.queries.byId(id)) ?? missing();
    return numberView(row, await this.secrets.status());
  }

  async create(body: NumberCreate, actorId: string): Promise<NumberView> {
    const row = await this.queries.insert({ row: body, actorId });
    await this.effects.after({ actorId, entity: 'wa_numbers', entityId: row.id, action: 'create', after: audited(row) });
    return this.view(row.id);
  }

  /**
   * is_default true → wa_number_make_default (409 not_enabled unless the number is on, checked before
   * any write); numberPatch for the rest. Whatever was written is audited and refreshes the config,
   * even when the default step then fails.
   */
  async update(id: string, body: NumberUpdate, actorId: string): Promise<NumberView> {
    const before = (await this.queries.byId(id)) ?? missing();
    const { is_default: isDefault, ...rest } = body;
    if (isDefault === true && !(rest.enabled ?? before.enabled)) throw new ConflictException({ message: 'not_enabled' });
    const patch = { ...numberPatch(before, rest), ...(isDefault === false ? { is_default: false as const } : {}) };
    let wrote = Object.keys(patch).length > 0;
    if (wrote && !(await this.queries.update(id, { patch, actorId }))) missing();
    try {
      if (isDefault === true) {
        if (!(await this.queries.makeDefault(id, actorId))) throw new ConflictException({ message: 'not_enabled' });
        wrote = true;
      }
    } finally {
      if (wrote) await this.updated({ id, before, actorId });
    }
    return this.view(id);
  }

  private async updated(input: { id: string; before: NumberRow; actorId: string }): Promise<void> {
    const { id, before, actorId } = input;
    const after = await this.queries.byId(id);
    await this.effects.after({ actorId, entity: 'wa_numbers', entityId: id, action: 'update', before: audited(before), after: audited(after) });
  }

  /** Only a disabled number (409 number_enabled); its Vault entries go with it. */
  async remove(id: string, actorId: string): Promise<void> {
    const before = (await this.queries.byId(id)) ?? missing();
    if (before.enabled || !(await this.queries.remove(id))) throw new ConflictException({ message: 'number_enabled' });
    await this.effects.after({ actorId, entity: 'wa_numbers', entityId: id, action: 'delete', before: audited(before) });
  }

  async setSecret(target: { id: string; name: NumberSecretName; value: string }, actorId: string): Promise<NumberView> {
    if (!(await this.queries.byId(target.id))) missing();
    await this.secrets.set({ id: target.id, name: target.name }, target.value);
    await this.effects.after({ actorId, entity: 'wa_numbers', entityId: target.id, action: 'secret_set', after: { name: target.name } });
    return this.view(target.id);
  }

  async clearSecret(target: { id: string; name: NumberSecretName }, actorId: string): Promise<NumberView> {
    if (!(await this.queries.byId(target.id))) missing();
    const cleared = await this.secrets.clear(target);
    await this.effects.after({ actorId, entity: 'wa_numbers', entityId: target.id, action: 'secret_clear', after: { name: target.name, cleared } });
    return this.view(target.id);
  }
}
