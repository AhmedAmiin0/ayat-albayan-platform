import { readFileSync } from 'node:fs';
import { INTEGRATION_SECRET_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 998 (stickers and GIFs in the chat, owner 2026-11-01), read as text: no database here.
const sql = readFileSync(migrationPath('20261101000998_chat_stickers.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('migration 998: sticker favourites and the GIPHY key', () => {
  it('sticker_favourites: one row per staff member and sticker, RLS on, own rows only', () => {
    expect(code).toContain('create table if not exists public.sticker_favourites');
    expect(code).toContain('profile_id uuid not null references public.profiles (id) on delete cascade');
    expect(code).toContain('message_id uuid not null references public.messages (id) on delete cascade');
    expect(code).toContain('primary key (profile_id, sticker_key)');
    expect(code).toContain('alter table public.sticker_favourites enable row level security;');
    expect(code).toContain('revoke all on public.sticker_favourites from anon;');
    expect(code).toMatch(/using \(profile_id = \(select auth\.uid\(\)\)\)\s+with check \(profile_id = \(select auth\.uid\(\)\)\);/);
  });

  it('the newest stickers are read through a partial index', () => {
    expect(code).toMatch(/create index if not exists messages_sticker_idx on public\.messages \(created_at desc\)\s+where media_mime = 'image\/webp';/);
  });

  it('integration_secret_key_ok lists every shared secret key, GIPHY_API_KEY included', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual([...INTEGRATION_SECRET_KEYS].sort());
    expect(code).toContain('revoke execute on function public.integration_secret_key_ok(text) from public, anon, authenticated;');
  });

  it('expand-only: drops and deletes nothing', () => {
    expect(code).not.toMatch(/\b(drop table|delete from|truncate)\b/i);
    expect(sql).toContain('MANUAL ROLLBACK');
  });
});
