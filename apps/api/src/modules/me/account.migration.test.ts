import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Migration 20261012000370 (R-ACC-05; rule 9): the avatars bucket and its own-folder policies, and
// NO self-write policy on public.profiles.

const sql = readFileSync(
  join(__dirname, '../../../../../packages/db/supabase/migrations/20261012000370_profile_self_service.sql'),
  'utf8',
);
const code = sql.replace(/--.*$/gm, '');

describe('migration 20261012000370 profile self-service', () => {
  it('adds a length-checked avatar_path, idempotently', () => {
    expect(code).toMatch(/add column if not exists avatar_path text/);
    expect(code).toMatch(/drop constraint if exists profiles_avatar_path_len/);
  });

  it('creates a private 2 MB bucket for jpeg, png and webp', () => {
    expect(code).toMatch(/\('avatars', 'avatars', false, 2097152, array\['image\/jpeg', 'image\/png', 'image\/webp'\]\)/);
  });

  it('limits writes and deletes to the caller’s own folder', () => {
    for (const verb of ['insert', 'update', 'delete']) {
      expect(code).toMatch(new RegExp(`storage_avatars_own_${verb} on storage\\.objects for ${verb}`));
    }
    expect(code.match(/split_part\(name, '\/', 1\) = \(select auth\.uid\(\)\)::text/g)?.length).toBe(5);
  });

  it('adds no policy on public.profiles (writes go through the API whitelist)', () => {
    expect(code).not.toMatch(/on public\.profiles/);
  });
});
