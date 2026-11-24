import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261107001200 (follow-up to #694, items 2-3) read as text: one nullable column,
// expand only, re-runnable, RLS untouched.
const NAME = '20261107001200_message_correction_text.sql';
const SQL = readFileSync(migrationPath(NAME), 'utf8')
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ');

describe('migration 20261107001200: messages.correction_text', () => {
  it('sorts after the corrects_id migration', () => {
    const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf(NAME)).toBeGreaterThan(all.indexOf('20261107000400_message_corrections.sql'));
  });

  it('only adds a nullable text column, re-runnable, with no backfill or policy change', () => {
    expect(SQL).toContain('add column if not exists correction_text text;');
    expect(SQL).not.toMatch(/drop (column|table|index)|truncate|delete from|policy|disable row/i);
    expect(SQL).not.toMatch(/not null|default|update public\.messages/i);
  });
});
