import { describe, expect, it, vi } from 'vitest';
import { configRow, fakeConfigStore } from '../config-store/config-store.fakes';
import { ConfigConflictError } from '../config-store/config-store.types';
import { writeLatest } from './settings-write';

describe('writeLatest (the PATCH /settings alias over config_set)', () => {
  it('one call for every key at its current version; a missing row is version 0; undefined is skipped', async () => {
    const store = fakeConfigStore([configRow('upload_max_mb', 4, { version: 12 })]);
    await writeLatest(store, { values: { upload_max_mb: 8, late_cancel_hours: null, fx_fresh_hours: undefined }, actorId: 'a1' });
    expect(store.set).toHaveBeenCalledExactlyOnceWith(
      [
        { key: 'upload_max_mb', value: 8, expectedVersion: 12 },
        { key: 'late_cancel_hours', value: null, expectedVersion: 0 },
      ],
      'a1',
    );
  });

  it('nothing to write: no read, no call', async () => {
    const store = fakeConfigStore();
    await writeLatest(store, { values: {}, actorId: 'a1' });
    expect(store.set).not.toHaveBeenCalled();
  });

  it('a concurrent write: retried ONCE with fresh versions (last writer wins)', async () => {
    const store = fakeConfigStore();
    store.fresh
      .mockResolvedValueOnce({ rev: 1, rows: [configRow('upload_max_mb', 4, { version: 3 })] })
      .mockResolvedValueOnce({ rev: 2, rows: [configRow('upload_max_mb', 5, { version: 9 })] });
    store.set.mockRejectedValueOnce(new ConfigConflictError('upload_max_mb', 9));
    await writeLatest(store, { values: { upload_max_mb: 8 }, actorId: 'a1' });
    expect(store.set).toHaveBeenNthCalledWith(2, [{ key: 'upload_max_mb', value: 8, expectedVersion: 9 }], 'a1');
  });

  it('a second conflict is thrown; any other error is thrown at once', async () => {
    const store = fakeConfigStore();
    store.set.mockRejectedValue(new ConfigConflictError('upload_max_mb', 9));
    await expect(writeLatest(store, { values: { upload_max_mb: 8 }, actorId: 'a1' })).rejects.toBeInstanceOf(ConfigConflictError);
    expect(store.set).toHaveBeenCalledTimes(2);
    const other = fakeConfigStore();
    other.set.mockRejectedValue(new Error('down'));
    await expect(writeLatest(other, { values: { upload_max_mb: 8 }, actorId: 'a1' })).rejects.toThrow('down');
    expect(other.set).toHaveBeenCalledTimes(1);
    expect(vi.isMockFunction(other.fresh)).toBe(true);
  });
});
