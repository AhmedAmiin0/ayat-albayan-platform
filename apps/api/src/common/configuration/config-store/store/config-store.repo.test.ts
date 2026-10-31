import { describe, expect, it, vi } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ConfigStoreRepo, rpcError } from './config-store.repo';
import { ConfigConflictError } from '@/common/configuration/config-store/config-store.types';

const dbRow = { key: 'upload_max_mb', value: 4, version: 3, description: null, description_seed: 'نص', description_edited: false, updated_at: 't', updated_by: 'u1', retired_at: null };

/** settings_revision answers `revs` one by one; settings answers `rows`; rpc answers `rpc`. */
function fakeDb(opts: { revs?: (number | null)[]; rows?: unknown[]; rpc?: { error: unknown } } = {}) {
  const revs = [...(opts.revs ?? [1, 1])];
  const maybeSingle = vi.fn(async () => {
    const rev = revs.length > 1 ? revs.shift() : revs[0];
    return { data: rev === null || rev === undefined ? null : { rev }, error: null };
  });
  const rowsSelect = vi.fn(async () => ({ data: opts.rows ?? [dbRow], error: null }));
  const from = vi.fn((table: string) =>
    table === 'settings_revision' ? { select: () => ({ eq: () => ({ maybeSingle }) }) } : { select: rowsSelect },
  );
  const rpc = vi.fn(async () => opts.rpc ?? { error: null });
  return { q: new ConfigStoreRepo({ from, rpc } as unknown as Db), rpc, rowsSelect };
}

describe('rpcError', () => {
  it('maps config_set SQLSTATE P0409 to a typed conflict (detail = key, hint = current version)', () => {
    const e = rpcError('config_set', { code: 'P0409', message: 'conflict', details: 'upload_max_mb', hint: '42' });
    expect(e).toBeInstanceOf(ConfigConflictError);
    expect(e).toMatchObject({ key: 'upload_max_mb', currentVersion: 42 });
    expect(rpcError('x', { code: 'P0409', message: 'conflict', details: 'k', hint: 'nope' })).toMatchObject({ currentVersion: 0 });
  });

  it('any other error is a plain Error naming the call', () => {
    const e = rpcError('config_set', { code: '22023', message: 'invalid change' });
    expect(e).not.toBeInstanceOf(ConfigConflictError);
    expect(e.message).toBe('config_set failed: invalid change');
  });
});

describe('ConfigStoreQueries', () => {
  it('snapshot maps the rows and the revision read before them', async () => {
    const { q } = fakeDb({ revs: [5, 5] });
    expect(await q.snapshot()).toEqual({
      rev: 5,
      rows: [{ key: 'upload_max_mb', value: 4, version: 3, description: null, descriptionSeed: 'نص', descriptionEdited: false, updatedAt: 't', updatedBy: 'u1', retiredAt: null }],
    });
  });

  it('a write between the two revision reads: the rows are read once more', async () => {
    const { q, rowsSelect } = fakeDb({ revs: [5, 6, 6, 6] });
    expect((await q.snapshot()).rev).toBe(6);
    expect(rowsSelect).toHaveBeenCalledTimes(2);
  });

  it('a missing revision row reads as 0', async () => {
    expect(await fakeDb({ revs: [null] }).q.revision()).toBe(0);
  });

  it('set sends one config_set: snake_case versions, null (and undefined) as JSON null', async () => {
    const { q, rpc } = fakeDb();
    await q.set([{ key: 'late_cancel_hours', value: null, expectedVersion: 0 }, { key: 'a', value: undefined, expectedVersion: 2 }], 'u1');
    expect(rpc).toHaveBeenCalledExactlyOnceWith('config_set', {
      changes: [{ key: 'late_cancel_hours', value: null, expected_version: 0 }, { key: 'a', value: null, expected_version: 2 }],
      actor: 'u1',
    });
  });

  it('set throws the conflict error on P0409', async () => {
    const { q } = fakeDb({ rpc: { error: { code: 'P0409', message: 'conflict', details: 'upload_max_mb', hint: '9' } } });
    await expect(q.set([{ key: 'upload_max_mb', value: 8, expectedVersion: 3 }], 'u1')).rejects.toBeInstanceOf(ConfigConflictError);
  });

  it('describe passes the key, text, hint key and actor', async () => {
    const { q, rpc } = fakeDb();
    await q.describe({ key: 'upload_max_mb', text: null, hintKey: 'settings.hints.uploadMaxMb', actorId: 'u1' });
    expect(rpc).toHaveBeenCalledWith('config_describe', { p_key: 'upload_max_mb', p_text: null, p_hint_key: 'settings.hints.uploadMaxMb', actor: 'u1' });
  });

  it('names asks for nothing without ids', async () => {
    const { q } = fakeDb();
    expect((await q.names([])).size).toBe(0);
  });
});
