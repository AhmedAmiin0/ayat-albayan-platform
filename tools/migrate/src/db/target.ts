// Target-DB adapter: the only code that talks to local/staging/production Postgres.
// local → DATABASE_URL; staging → session pooler DSN (config.ts guards host/user); one connection.
import postgres from 'postgres';
import type { TargetConfig } from '../config.ts';
import type { ColumnValue, EntityName, Existing, PlanCounts, TargetName } from '../types.ts';
import {
  type ImportItemWrite,
  type InsertSpec,
  type SqlText,
  findByColumnSql,
  insertSql,
  recordItemSql,
  updateSql,
} from './sql.ts';

export type { ImportItemWrite } from './sql.ts';

export interface TargetTx {
  /** Returns the new id, or null for link tables (`returning: null`). */
  insert(spec: InsertSpec): Promise<string | null>;
  update(spec: { table: string; id: string; columns: Record<string, ColumnValue> }): Promise<void>;
  /** Upsert on (entity, natural_key): keeps first_run_id, moves last_run_id and hash. */
  recordItem(item: ImportItemWrite): Promise<void>;
  /** Escape hatch for entity-specific writes (e.g. a link row with a composite key). */
  exec(q: SqlText): Promise<void>;
}

export interface TargetDb {
  readonly name: TargetName;
  /** keyId ('entity:key') → existing row for every import_items row of these entities. */
  loadImportItems(entities: readonly EntityName[]): Promise<Map<string, Existing>>;
  /** value → id, to adopt rows the app created before the import (guardians.phone_e164 …). */
  findByColumn(q: {
    table: string;
    column: string;
    values: readonly string[];
  }): Promise<Map<string, string>>;
  /**
   * One apply per target at a time: a session advisory lock taken before planning (so the plan
   * sees the other run's import_items), released when the connection closes. Throws if held.
   */
  lockApply(): Promise<void>;
  startRun(o: { sources: Record<string, unknown>; gitSha: string | null }): Promise<string>;
  finishRun(o: { runId: string; ok: boolean; counts: PlanCounts; error?: string }): Promise<void>;
  /** One transaction; a throw rolls back everything written through `tx`. */
  transaction<T>(fn: (tx: TargetTx) => Promise<T>): Promise<T>;
  /** Read-only queries for validate. */
  select<T extends object>(q: SqlText): Promise<T[]>;
  close(): Promise<void>;
}

type Sql = postgres.Sql | postgres.TransactionSql;

async function run<T extends object>(sql: Sql, q: SqlText): Promise<T[]> {
  return (await sql.unsafe(
    q.text,
    q.params as postgres.ParameterOrJSON<never>[],
  )) as unknown as T[];
}

function txOf(sql: Sql): TargetTx {
  return {
    async insert(spec) {
      const rows = await run<{ id: string }>(sql, insertSql(spec));
      return spec.returning === null ? null : (rows[0]?.id ?? null);
    },
    async update(spec) {
      await run(sql, updateSql(spec));
    },
    async recordItem(i) {
      await run(sql, recordItemSql(i));
    },
    async exec(q) {
      await run(sql, q);
    },
  };
}

export function createTargetDb(config: TargetConfig): TargetDb {
  const sql = postgres(config.databaseUrl, {
    max: 1,
    ssl: config.ssl ? 'require' : false,
    onnotice: () => {},
  });
  return {
    name: config.name,
    async loadImportItems(entities) {
      type Item = {
        entity: string;
        natural_key: string;
        target_id: string | null;
        payload_hash: string;
      };
      const rows = await run<Item>(sql, {
        text: 'select entity, natural_key, target_id::text, payload_hash from public.import_items where entity = any($1)',
        params: [entities],
      }).catch((err: unknown) => {
        // Migration 160 not deployed yet: a dry-run plans as a first run; apply fails at startRun.
        if ((err as { code?: string }).code !== '42P01') throw err;
        console.warn(
          'import_items missing on target (migration 20261001000160 not applied): first-run plan',
        );
        return [] as Item[];
      });
      return new Map(
        rows.map((r) => [
          `${r.entity}:${r.natural_key}`,
          { targetId: r.target_id, hash: r.payload_hash },
        ]),
      );
    },
    async findByColumn(q) {
      if (q.values.length === 0) return new Map();
      const rows = await run<{ id: string; value: string }>(sql, findByColumnSql(q));
      return new Map(rows.map((r) => [r.value, r.id]));
    },
    async lockApply() {
      const [row] = await run<{ ok: boolean }>(sql, {
        text: `select pg_try_advisory_lock(hashtext('ab_migrate_apply')) as ok`,
        params: [],
      });
      if (!row?.ok) throw new Error(`Another apply is running on ${config.name}; wait for it`);
    },
    async startRun(o) {
      const rows = await run<{ id: string }>(sql, {
        text: 'insert into public.import_runs (target, sources, git_sha) values ($1, $2::jsonb, $3) returning id',
        params: [config.name, o.sources, o.gitSha],
      });
      const id = rows[0]?.id;
      if (!id) throw new Error('import_runs insert returned no id');
      return id;
    },
    async finishRun(o) {
      await run(sql, {
        text: `update public.import_runs set status = $2, counts = $3::jsonb, error = $4, finished_at = now() where id = $1`,
        params: [o.runId, o.ok ? 'succeeded' : 'failed', { ...o.counts }, o.error ?? null],
      });
    },
    transaction: (fn) => sql.begin((tx) => fn(txOf(tx))) as Promise<Awaited<ReturnType<typeof fn>>>,
    select: (q) => run(sql, q),
    close: () => sql.end({ timeout: 5 }),
  };
}
