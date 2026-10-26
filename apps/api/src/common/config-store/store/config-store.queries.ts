import type { Json } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../db/db.module';
import { ConfigConflictError, type ConfigChange, type ConfigRow, type ConfigSnapshot } from '../config-store.types';

const COLUMNS = 'key, value, version, description, description_seed, description_edited, updated_at, updated_by, retired_at';

/** The bits of a PostgREST error the mapping reads. */
interface RpcError {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

/** config_set's P0409 (detail = key, hint = current version) → ConfigConflictError; anything else → Error. */
export function rpcError(what: string, error: RpcError): Error {
  if (error.code === 'P0409') {
    const version = Number(error.hint ?? '0');
    return new ConfigConflictError(error.details ?? '', Number.isFinite(version) ? version : 0);
  }
  return new Error(`${what} failed: ${error.message}`);
}

interface DbRow {
  key: string;
  value: unknown;
  version: number;
  description: string | null;
  description_seed: string | null;
  description_edited: boolean;
  updated_at: string | null;
  updated_by: string | null;
  retired_at: string | null;
}

const toConfigRow = (r: DbRow): ConfigRow => ({
  key: r.key,
  value: r.value,
  version: r.version,
  description: r.description,
  descriptionSeed: r.description_seed,
  descriptionEdited: r.description_edited,
  updatedAt: r.updated_at,
  updatedBy: r.updated_by,
  retiredAt: r.retired_at,
});

interface DescribeCall {
  key: string;
  text: string | null;
  hintKey: string | null;
  actorId: string;
}

/** All database access of the config store: rows + revision, and the three service-role RPCs. */
@Injectable()
export class ConfigStoreQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** settings_revision.rev (0 when the row is missing, e.g. right after a truncate). */
  async revision(): Promise<number> {
    const { data, error } = await this.db.from('settings_revision').select('rev').eq('id', true).maybeSingle();
    if (error) throw new Error(`settings revision read failed: ${error.message}`);
    return data?.rev ?? 0;
  }

  async rows(): Promise<ConfigRow[]> {
    const { data, error } = await this.db.from('settings').select(COLUMNS);
    if (error) throw new Error(`settings read failed: ${error.message}`);
    return (data as DbRow[]).map(toConfigRow);
  }

  /**
   * Rows with a revision that is not newer than them: rev, rows, rev again; when a write landed in
   * between, once more. The returned rev is the one read BEFORE the rows, so a racing write can only
   * make the next revision check reload, never hide a change.
   */
  async snapshot(): Promise<ConfigSnapshot> {
    let snap = await this.attempt();
    if (snap.rev !== snap.after) snap = await this.attempt();
    return { rev: snap.rev, rows: snap.rows };
  }

  /** config_set: one transaction for every change; P0409 → ConfigConflictError. */
  async set(changes: readonly ConfigChange[], actorId: string): Promise<void> {
    const payload = changes.map((c) => ({ key: c.key, value: c.value ?? null, expected_version: c.expectedVersion }));
    const { error } = await this.db.rpc('config_set', { changes: payload as Json, actor: actorId });
    if (error) throw rpcError('config_set', error);
  }

  async describe(call: DescribeCall): Promise<void> {
    const { error } = await this.db.rpc('config_describe', {
      p_key: call.key,
      p_text: call.text,
      p_hint_key: call.hintKey,
      actor: call.actorId,
    });
    if (error) throw rpcError('config_describe', error);
  }

  /** profiles.full_name of each writer id. */
  async names(ids: readonly string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (ids.length === 0) return out;
    const { data, error } = await this.db.from('profiles').select('id, full_name').in('id', [...new Set(ids)]);
    if (error) throw new Error(`profiles read failed: ${error.message}`);
    for (const p of data) out.set(p.id, p.full_name);
    return out;
  }

  private async attempt(): Promise<{ rev: number; rows: ConfigRow[]; after: number }> {
    const rev = await this.revision();
    const rows = await this.rows();
    return { rev, rows, after: await this.revision() };
  }
}
