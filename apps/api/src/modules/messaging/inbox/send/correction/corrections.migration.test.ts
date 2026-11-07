import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR, migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261107000400 («تعديل» = a correction, owner 2026-11-07) read as text: expand only,
// re-runnable, RLS untouched.
const NAME = '20261107000400_message_corrections.sql';
const SQL = readFileSync(migrationPath(NAME), 'utf8')
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ');

describe('migration 20261107000400: messages.corrects_id', () => {
  it('sorts after every migration before it', () => {
    const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    expect(all.indexOf(NAME)).toBeGreaterThan(all.indexOf('20261107000100_storage_move_trigger_safety.sql'));
  });

  it('only adds a nullable column, its FK (set null) and a partial index, all re-runnable', () => {
    expect(SQL).not.toMatch(/drop (column|table|index)|truncate|delete from|policy|disable row/i);
    expect(SQL).toContain('add column if not exists corrects_id uuid;');
    expect(SQL).toContain("if not exists (select 1 from pg_constraint where conname = 'messages_corrects_id_fkey')");
    expect(SQL).toContain('references public.messages (id) on delete set null not valid');
    expect(SQL).toContain('validate constraint messages_corrects_id_fkey');
    expect(SQL).toContain(
      'create index if not exists messages_corrects_idx on public.messages (corrects_id) where corrects_id is not null',
    );
    expect(SQL).not.toMatch(/not null default|update public\.messages/);
  });
});
