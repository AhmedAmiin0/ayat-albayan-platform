import type { NumberCreate, NumberError, WaLine } from '@ab/shared';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Database } from '@ab/db';
import { DB, type Db } from '../../../common/db/db.module';
import type { NumberPatch } from './numbers.patch';

export type NumberRow = Database['public']['Tables']['wa_numbers']['Row'];
type Health = Pick<NumberRow, 'health' | 'checked_at'> & { display_phone_e164?: string };

const COLUMNS =
  'id, label, purpose, provider, phone_number_id, waba_id, app_id, display_phone_e164, enabled, is_default, fallback_rank, health, checked_at, created_at, updated_at, updated_by';

/** A unique violation in words: the phone id or the role's live default is taken. */
function conflictOf(error: { code?: string; message: string }): never {
  if (error.code !== '23505') throw new Error(`numbers write failed: ${error.message}`);
  const reason: NumberError = error.message.includes('default_per_purpose') ? 'default_taken' : 'phone_taken';
  throw new ConflictException({ message: reason });
}

/** public.wa_numbers (migration 20261023000620): the rows only; credentials are numbers.secrets.ts. */
@Injectable()
export class NumbersQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async all(): Promise<NumberRow[]> {
    const { data, error } = await this.db.from('wa_numbers').select(COLUMNS).order('purpose').order('created_at');
    if (error) throw new Error(`numbers read failed: ${error.message}`);
    return data;
  }

  async byId(id: string): Promise<NumberRow | null> {
    const { data, error } = await this.db.from('wa_numbers').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw new Error(`number read failed: ${error.message}`);
    return data;
  }

  /** Each role's default ENABLED number (at most one per role, by index). */
  async defaults(): Promise<NumberRow[]> {
    const { data, error } = await this.db.from('wa_numbers').select(COLUMNS).eq('enabled', true).eq('is_default', true);
    if (error) throw new Error(`numbers read failed: ${error.message}`);
    return data;
  }

  /**
   * The enabled default `calls` number (docs/28 §10), read under either comms source; null = none.
   */
  async callsDefault(): Promise<NumberRow | null> {
    const q = this.db
      .from('wa_numbers')
      .select(COLUMNS)
      .eq('purpose', 'calls')
      .eq('enabled', true)
      .eq('is_default', true);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(`calls number read failed: ${error.message}`);
    return data;
  }

  async insert(input: { row: NumberCreate & { is_default?: boolean }; actorId: string }): Promise<NumberRow> {
    const { data, error } = await this.db
      .from('wa_numbers')
      .insert({ ...input.row, updated_by: input.actorId })
      .select(COLUMNS)
      .single();
    if (error) conflictOf(error);
    return data;
  }

  /** null = no such number. is_default true goes through makeDefault, not here. */
  async update(id: string, input: { patch: NumberPatch; actorId: string }): Promise<NumberRow | null> {
    const { data, error } = await this.db
      .from('wa_numbers')
      .update({ ...input.patch, updated_by: input.actorId })
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) conflictOf(error);
    return data;
  }

  /** false = missing or not enabled. The role's other default is unset in the same call. */
  async makeDefault(id: string, actorId: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('wa_number_make_default', { p_id: id, p_actor: actorId });
    if (error) conflictOf(error);
    return data === true;
  }

  /** false = missing or still enabled. Deletes its Vault entries in the same call. */
  async remove(id: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('wa_number_delete', { p_id: id });
    if (error) throw new Error(`number delete failed: ${error.message}`);
    return data === true;
  }

  /** The last line check of a phone id, on every row that has it (#134 item 9). */
  async saveHealth(phoneNumberId: string, health: Health): Promise<void> {
    const { error } = await this.db.from('wa_numbers').update(health).eq('phone_number_id', phoneNumberId);
    if (error) throw new Error(`number health write failed: ${error.message}`);
  }

  async hasDefault(purpose: WaLine): Promise<boolean> {
    const { count, error } = await this.db
      .from('wa_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('purpose', purpose)
      .eq('enabled', true)
      .eq('is_default', true);
    if (error) throw new Error(`numbers read failed: ${error.message}`);
    return (count ?? 0) > 0;
  }
}
