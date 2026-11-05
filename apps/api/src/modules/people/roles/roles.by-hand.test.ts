import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultGrantsOf } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';
import { GRANTED_BY_HAND } from './roles.by-hand.test-util';

const SQL = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
  .join('\n');

describe('keys granted by hand in production (owner 2026-11-02, no migration)', () => {
  it('are catalog defaults of the system sales role and held by the admin', () => {
    expect(defaultGrantsOf('sales')).toEqual(expect.arrayContaining(GRANTED_BY_HAND.sales));
    expect(defaultGrantsOf('admin')).toEqual(expect.arrayContaining(GRANTED_BY_HAND.admin));
  });

  it('are seeded by no migration (else they belong to the seed test, not here)', () => {
    for (const key of [...GRANTED_BY_HAND.sales, ...GRANTED_BY_HAND.admin])
      expect(SQL).not.toContain(`'${key}'`);
  });

  it('never reach a teacher or a teaching assistant', () => {
    for (const who of ['teacher', 'assistant'] as const) {
      expect(defaultGrantsOf(who).filter((k) => GRANTED_BY_HAND.sales.includes(k))).toEqual([]);
    }
  });
});
