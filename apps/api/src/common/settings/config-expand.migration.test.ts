import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 630 (docs/26 §2a, 26-P1 expand): inert columns, revision table, config_seed / config_set.
// No database in unit tests; e2e/tests/config-expand.sql.spec.ts runs it against Postgres.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261023000630_config_expand.sql'), 'utf8');
const body = (fn: string): string => new RegExp(`function public\\.${fn}\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`).exec(sql)?.[1] ?? '';

describe('migration 630: config expand', () => {
  it('config_seed never writes a value or a description on an existing row', () => {
    const update = /on conflict \(key\) do update set([\s\S]*?)where/.exec(body('config_seed'))?.[1] ?? '';
    expect(update).toContain('module = excluded.module');
    expect(update).not.toMatch(/\bvalue\s*=/);
    expect(update).not.toMatch(/\bdescription(_edited)?\s*=/);
    // A new row is JSON null (= the registry default), never a seeded value.
    expect(body('config_seed')).toContain("(e ->> 'key', 'null'::jsonb,");
  });

  it('config_seed is a no-op for an older build and skips when another boot holds the lock', () => {
    expect(body('config_seed')).toContain('pg_try_advisory_xact_lock');
    expect(body('config_seed')).toMatch(/if stored > config_seed\.registry_version then\s+return/);
    expect(body('config_seed')).toContain('exception when others then');
  });

  it('config_set checks a per-key expected version and stores JSON null instead of deleting', () => {
    const fn = body('config_set');
    expect(fn).toContain("errcode = 'P0409'");
    expect(fn).toContain('for update');
    expect(fn).toMatch(/if expected <> 0 then/);
    expect(fn).not.toMatch(/delete from/);
  });

  it('adds the three data checks NOT VALID', () => {
    for (const name of ['settings_key_format', 'settings_value_size', 'settings_kind']) {
      expect(sql).toMatch(new RegExp(`\\('${name}',[\\s\\S]*?not valid'\\)`));
    }
  });

  it('keeps both RPCs service-role only, security definer with an empty search_path', () => {
    expect(sql).toContain("'config_seed(jsonb, int)', 'config_set(jsonb, uuid)'");
    expect(sql).toContain("revoke execute on function public.%s from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.%s to service_role");
    for (const fn of ['config_seed', 'config_set']) {
      expect(sql).toMatch(new RegExp(`function public\\.${fn}\\([^)]*\\) returns jsonb\\s+language plpgsql security definer set search_path = ''`));
    }
  });

  it('inserts or updates no settings value outside the two RPC bodies', () => {
    const outside = sql.replace(body('config_seed'), '').replace(body('config_set'), '');
    expect(outside).not.toMatch(/(insert into|update)\s+public\.settings\b(?!_revision)/);
  });
});
