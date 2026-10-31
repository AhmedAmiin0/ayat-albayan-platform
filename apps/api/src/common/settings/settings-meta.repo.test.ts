import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { SettingsMetaRepo } from './settings-meta.repo';

type Result = { data: unknown; error: { message: string } | null };
type MetaRow = { key: string; value: unknown; updated_at: string; updated_by: string | null };

const ok = (data: unknown): Result => ({ data, error: null });
const fail = (message: string): Result => ({ data: null, error: { message } });

/** settings answers `rows`; profiles answers `profiles` for its .in('id', ids) filter. */
function queries(rows: Result, profiles: Result = ok([])) {
  const inIds = vi.fn().mockResolvedValue(profiles);
  const from = vi.fn((table: string) =>
    table === 'settings' ? { select: vi.fn().mockResolvedValue(rows) } : { select: vi.fn().mockReturnValue({ in: inIds }) },
  );
  return { q: new SettingsMetaRepo({ from } as unknown as Db), from, inIds };
}

const row = (key: string, by: string | null, value: unknown = 1): MetaRow => ({ key, value, updated_at: '2026-10-05T00:00:00Z', updated_by: by });

describe('SettingsMetaQueries.meta (GET /config/meta)', () => {
  it('asks for no profiles when no row has an updated_by', async () => {
    const { q, from } = queries(ok([row('upload_max_mb', null)]));
    expect(await q.meta()).toEqual({ upload_max_mb: { updatedAt: '2026-10-05T00:00:00Z', updatedBy: null, updatedByName: null } });
    expect(from).not.toHaveBeenCalledWith('profiles');
  });

  it('joins the admin names, asking once for each distinct id', async () => {
    const { q, inIds } = queries(ok([row('a', 'u1'), row('b', 'u1'), row('c', 'u2')]), ok([{ id: 'u1', full_name: 'منى' }, { id: 'u2', full_name: 'سارة' }]));
    const meta = await q.meta();
    expect(inIds).toHaveBeenCalledWith('id', ['u1', 'u2']);
    expect([meta['a']?.updatedByName, meta['b']?.updatedByName, meta['c']?.updatedByName]).toEqual(['منى', 'منى', 'سارة']);
    expect(meta['c']?.updatedBy).toBe('u2');
  });

  it('gives a null name for an id with no profile', async () => {
    const { q } = queries(ok([row('a', 'gone')]), ok([]));
    expect((await q.meta())['a']).toEqual({ updatedAt: '2026-10-05T00:00:00Z', updatedBy: 'gone', updatedByName: null });
  });

  it('skips a seeded row nobody wrote (JSON null, no writer); keeps an admin null save', async () => {
    const { q } = queries(ok([row('seeded', null, null), row('cleared', 'u1', null)]), ok([{ id: 'u1', full_name: 'منى' }]));
    const meta = await q.meta();
    expect(Object.keys(meta)).toEqual(['cleared']);
    expect(meta['cleared']?.updatedByName).toBe('منى');
  });

  it('throws on a read error of either table', async () => {
    await expect(queries(fail('boom')).q.meta()).rejects.toThrow('settings read failed: boom');
    await expect(queries(ok([row('a', 'u1')]), fail('nope')).q.meta()).rejects.toThrow('profiles read failed: nope');
  });
});
