import { describe, expect, it, vi } from 'vitest';
import type { StorageEnv } from '@/config/env/env.storage';
import { GoogleApiError, type GoogleConnection } from '@/modules/platform/google-sync';
import type { DriveBackupData } from './drive-backup.data';
import { DriveBackupRunner } from './drive-backup.runner';
import { FakeDrive } from './drive/drive-backup.fakes';
import { MemoryStore } from './run/backup-store.fakes';
import { RESERVE_BYTES } from './run/quota';
import { FakeMinio } from './source/backup-source.fakes';

const MB = 1024 ** 2;
const MINIO = {
  endpoint: 'http://ayat-minio:9000',
  publicUrl: 'https://files.example.test',
  region: 'us-east-1',
  bucketPrefix: '',
  accessKey: 'ayat-app',
  secretKey: 'x'.repeat(20),
};
const ON: StorageEnv = { driver: 'minio', minio: MINIO, recordings: false, driveBackup: true };

function setup(tokens: string[]) {
  const drive = new FakeDrive();
  const minio = new FakeMinio();
  const store = new MemoryStore();
  const read = vi.fn().mockResolvedValue({ folder_id: null, account_email: null });
  const state = { read, save: vi.fn() };
  const alerts = { failed: vi.fn(), skipped: vi.fn(), driveFull: vi.fn() };
  const data = { store, state, alerts } as unknown as DriveBackupData;
  const refreshToken = vi.fn();
  tokens.forEach((tk) => refreshToken.mockResolvedValueOnce(tk));
  const connection = { refreshToken, authFailed: vi.fn(), configFailed: vi.fn() };
  const factory = { drive: () => drive, source: () => minio, config: () => ON };
  const runner = new DriveBackupRunner(connection as unknown as GoogleConnection, data, factory);
  return { drive, minio, store, alerts, connection, runner };
}

describe('DriveBackupRunner: the night’s byte budget (docs/45 §5.1)', () => {
  it('uploads no more than free − reserve: the rest waits for the next night', async () => {
    const t = setup(['rt']);
    for (const key of ['a', 'b', 'c']) {
      t.minio.set({ bucket: 'reports', key, body: Buffer.alloc(2 * MB) });
    }
    const limit = 15 * 1024 * MB;
    const usage = limit - RESERVE_BYTES - 6 * MB + 1;
    t.drive.quotaAnswer = { limit, usage, email: 'a@example.test' };
    expect(await t.runner.runOnce()).toBe('ran');
    expect(t.store.rows.map((r) => r.objects.length)).toEqual([2]);
    expect(t.alerts.driveFull).toHaveBeenCalledOnce();
  });

  it('no room for any part: Drive asked once by the run, every object waits', async () => {
    const t = setup(['rt']);
    for (let i = 0; i < 200; i += 1) t.minio.set({ bucket: 'reports', key: `k${i}`, body: 'x' });
    const limit = 15 * 1024 * MB;
    t.drive.quotaAnswer = { limit, usage: limit - RESERVE_BYTES - MB / 2, email: 'a@example.test' };
    expect(await t.runner.runOnce()).toBe('ran');
    expect(t.drive.log.filter((m) => m === 'quota')).toHaveLength(2); // status line, the night
    expect(t.drive.log).not.toContain('startUpload');
    expect(t.alerts.driveFull).toHaveBeenCalledOnce();
    expect(t.alerts.failed).not.toHaveBeenCalled();
  });
});

describe('DriveBackupRunner: a token replaced during the run', () => {
  it('a refusal of the old token never disconnects the new connection', async () => {
    const t = setup(['old', 'new']);
    t.drive.failNext.set('quota', new GoogleApiError(400, 'invalid_grant'));
    expect(await t.runner.runOnce()).toBe('failed');
    expect(t.connection.authFailed).not.toHaveBeenCalled();
    expect(t.connection.configFailed).not.toHaveBeenCalled();
    expect(t.alerts.failed).toHaveBeenCalledOnce();
  });

  it('the same token still held: the Google sync’s own handling runs', async () => {
    const t = setup(['rt', 'rt']);
    t.drive.failNext.set('quota', new GoogleApiError(400, 'invalid_grant'));
    expect(await t.runner.runOnce()).toBe('failed');
    expect(t.connection.authFailed).toHaveBeenCalledOnce();
  });
});
