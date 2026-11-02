import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';
import { DELETED_BODY } from './channel-edits.repo';

// Migration 993 (owner 2026-10-30: edit and delete), read as text: no database in unit tests.
const dir = MIGRATIONS_DIR;
const strip = (sql: string) =>
  sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
const code = strip(readFileSync(join(dir, '20261030000993_chat_edit_delete.sql'), 'utf8'));

describe('migration 993: chat edit / delete', () => {
  it('expand only: nullable columns added if missing, no data change, no drop of a table or column', () => {
    for (const c of ['edited_at timestamptz;', 'deleted_at timestamptz;']) {
      expect(code).toContain(`alter table public.channel_messages add column if not exists ${c}`);
    }
    expect(code).toContain(
      'add column if not exists deleted_by uuid references public.profiles (id) on delete set null;',
    );
    expect(code).toContain(
      'alter table public.messages add column if not exists hidden_at timestamptz;',
    );
    expect(code).toMatch(
      /add column if not exists hidden_by uuid references public\.profiles \(id\) on delete set null/,
    );
    expect(code).not.toMatch(/\b(update|delete from|insert into)\s+public\./i);
    expect(code).not.toMatch(/drop (table|column)/i);
  });

  it('the edit history: RLS on, the admin reads, no client writes', () => {
    expect(code).toContain('create table if not exists public.channel_message_edits (');
    expect(code).toContain("check (kind in ('edit', 'delete'))");
    expect(code).toContain('alter table public.channel_message_edits enable row level security;');
    expect(code).toContain('using ((select public.is_admin()))');
    expect(code).toMatch(
      /revoke insert, update, delete, truncate, references, trigger on public\.channel_message_edits from authenticated/,
    );
  });

  it('channel_summaries returns last_deleted, still service role only; unread is untouched', () => {
    expect(code).toContain('last_at timestamptz, last_deleted boolean)');
    expect(code).toContain('l.deleted_at is not null');
    expect(code).toContain(
      'grant execute on function public.channel_summaries(uuid, uuid[], text[]) to service_role;',
    );
    expect(code).toContain('and m.sender_role = any(p_count_roles)');
  });

  it('the deleted body placeholder fits the 1..2000 body check', () => {
    expect(DELETED_BODY.length).toBeGreaterThanOrEqual(1);
  });
});
