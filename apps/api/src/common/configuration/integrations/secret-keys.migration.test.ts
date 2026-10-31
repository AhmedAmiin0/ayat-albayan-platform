import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// The Vault allow-list in force: the LAST migration that (re)defines integration_secret_key_ok must
// list exactly the shared secret keys. A new secret key needs a new migration re-creating it
// (docs/25). No database in unit tests: the SQL is read as text.
const dir = MIGRATIONS_DIR;
const DEFINES = 'function public.integration_secret_key_ok(p_key text)';
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const defining = files.filter((f) => readFileSync(join(dir, f), 'utf8').includes(DEFINES));
const latest = defining.at(-1) ?? '';

describe('integration_secret_key_ok: the latest definition matches INTEGRATION_SECRET_KEYS', () => {
  it('finds the migrations that define it, in file order', () => {
    expect(defining.length).toBeGreaterThan(0);
    expect(defining).toContain('20261012000310_integration_config.sql');
  });

  it('the last one lists exactly the shared secret keys', () => {
    const sql = readFileSync(join(dir, latest), 'utf8');
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
  });
});
