import { describe, expect, it, vi } from 'vitest';
import { fakeConfigStore } from '@/common/configuration/config-store/config-store.fakes';
import type { Db } from '@/common/db/db.module';
import { SettingsService } from './settings.service';

// The gate routes and comms_source write without a version (docs/26 §2f: OFF is always accepted).
function service(error: { message: string } | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error });
  const from = vi.fn().mockReturnValue({ upsert });
  const store = fakeConfigStore();
  return { svc: new SettingsService({ from } as unknown as Db, 30_000, store), upsert, store };
}

describe('SettingsService.writeSwitch', () => {
  it('one upsert of that key, no version read and no config_set', async () => {
    const { svc, upsert, store } = service();
    await svc.writeSwitch('messaging_enabled', false, 'a1');
    expect(upsert).toHaveBeenCalledExactlyOnceWith({ key: 'messaging_enabled', value: false, updated_by: 'a1' });
    expect(store.fresh).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
    expect(store.invalidate).toHaveBeenCalled();
  });

  it('a failed write throws and still drops the caches', async () => {
    const { svc, store } = service({ message: 'down' });
    await expect(svc.writeSwitch('messaging_enabled', false, 'a1')).rejects.toThrow('settings write failed: down');
    expect(store.invalidate).toHaveBeenCalled();
  });
});
