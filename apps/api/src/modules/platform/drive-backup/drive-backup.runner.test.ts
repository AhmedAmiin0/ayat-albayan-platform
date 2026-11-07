import { describe, expect, it, vi } from 'vitest';
import type { StorageEnv } from '@/config/env/env.storage';
import { GoogleApiError, type GoogleConnection } from '@/modules/platform/google-sync';
import type { DriveBackupData } from './drive-backup.data';
import { bucketsOf, DriveBackupRunner } from './drive-backup.runner';
import { FakeDrive } from './drive/drive-backup.fakes';
import { MemoryStore } from './run/backup-store.fakes';
import { FakeMinio } from './source/backup-source.fakes';

const GB = 1024 ** 3;
const MINIO = {
  endpoint: 'http://ayat-minio:9000',
  publicUrl: 'https://files.example.test',
  region: 'us-east-1',
  bucketPrefix: '',
  accessKey: 'ayat-app',
  secretKey: 'x'.repeat(20),
};
const ON: StorageEnv = { driver: 'minio', minio: MINIO, recordings: false, driveBackup: true };

function setup(input: { cfg?: StorageEnv; token?: string | null } = {}) {
  const drive = new FakeDrive();
  const minio = new FakeMinio();
  const state = {
    read: vi.fn().mockResolvedValue({ folder_id: null, account_email: null }),
    save: vi.fn(),
  };
  const alerts = { failed: vi.fn(), skipped: vi.fn(), driveFull: vi.fn() };
  const data = { store: new MemoryStore(), state, alerts } as unknown as DriveBackupData;
  const connection = {
    refreshToken: vi.fn().mockResolvedValue(input.token === undefined ? 'rt' : input.token),
    authFailed: vi.fn(),
    configFailed: vi.fn(),
  };
  const factory = { drive: vi.fn(() => drive), source: () => minio, config: () => input.cfg ?? ON };
  const runner = new DriveBackupRunner(connection as unknown as GoogleConnection, data, factory);
  return { drive, minio, state, alerts, connection, factory, runner };
}

describe('DriveBackupRunner (docs/45 §5)', () => {
  it('off by default, or without MinIO: no Google call at all', async () => {
    for (const cfg of [
      { ...ON, driveBackup: false },
      { ...ON, minio: null },
    ]) {
      const t = setup({ cfg });
      expect(await t.runner.runOnce()).toBe('off');
      expect(t.connection.refreshToken).not.toHaveBeenCalled();
    }
  });

  it('Google disconnected: no run, no Drive call', async () => {
    const t = setup({ token: null });
    expect(await t.runner.runOnce()).toBe('not_connected');
    expect(t.factory.drive).not.toHaveBeenCalled();
    expect(t.drive.log).toEqual([]);
  });

  it('runs: the folder of the token’s own account, then the archive; state saved', async () => {
    const t = setup();
    t.minio.set({ bucket: 'reports', key: 'a.pdf', body: 'a' });
    expect(await t.runner.runOnce({ now: new Date('2026-11-07T01:00:00Z') })).toBe('ran');
    expect(t.state.save).toHaveBeenCalledWith(
      expect.objectContaining({ account_email: 'academy@example.test' }),
    );
    expect(t.state.save).toHaveBeenLastCalledWith({
      last_run_at: '2026-11-07T01:00:00.000Z',
      last_error: null,
      skipped: [],
      skipped_count: 0,
      waiting: 0,
    });
    expect(t.drive.log).toContain('createFolder');
    expect(t.alerts.driveFull).not.toHaveBeenCalled();
  });

  it('under the 2 GB reserve: uploads nothing; «Drive nearly full» told', async () => {
    const t = setup();
    t.minio.set({ bucket: 'reports', key: 'a.pdf', body: 'a' });
    t.drive.quotaAnswer = { limit: 15 * GB, usage: 14 * GB, email: 'academy@example.test' };
    expect(await t.runner.runOnce()).toBe('ran');
    expect(t.drive.log).not.toContain('startUpload');
    expect(t.state.save).toHaveBeenLastCalledWith(expect.objectContaining({ waiting: 1 }));
    expect(t.alerts.driveFull).toHaveBeenCalledOnce();
  });

  it('Drive refuses for space (storageQuotaExceeded): recorded, «Drive nearly full»', async () => {
    const t = setup();
    t.minio.set({ bucket: 'reports', key: 'a.pdf', body: 'a' });
    t.drive.failNext.set('putChunk', new GoogleApiError(403, 'storageQuotaExceeded'));
    expect(await t.runner.runOnce()).toBe('failed');
    expect(t.alerts.driveFull).toHaveBeenCalledOnce();
    expect(t.alerts.failed).not.toHaveBeenCalled();
  });

  it('a refused token goes through the Google sync’s own handling (disconnect)', async () => {
    const t = setup();
    t.drive.failNext.set('quota', new GoogleApiError(400, 'invalid_grant'));
    expect(await t.runner.runOnce()).toBe('failed');
    expect(t.connection.authFailed).toHaveBeenCalledOnce();
  });

  it('recordings only when they go to MinIO at all', () => {
    expect(bucketsOf({ recordings: false })).not.toContain('recordings');
    expect(bucketsOf({ recordings: true })).toContain('recordings');
  });
});
