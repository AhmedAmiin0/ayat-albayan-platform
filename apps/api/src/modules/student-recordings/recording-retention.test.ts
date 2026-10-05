import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type { SettingsService } from '../../common/settings/settings.service';
import type { StorageService } from '../../common/storage/storage.service';
import type { RecordingAdminQueries } from './recording-admin.queries';
import { RecordingEraser } from './recording-eraser';
import { RecordingMaintenanceJob } from './recording-maintenance.job';
import { RecordingRetention, RETENTION_KEY } from './recording-retention';
import type { RecordingRetentionQueries } from './recording-retention.queries';

const NOW = new Date('2026-10-05T12:00:00.000Z');
const settings = { read: vi.fn() };
const q = { failStuck: vi.fn(), expired: vi.fn() };
const admin = { markDeleted: vi.fn() };
const storage = { remove: vi.fn() };
const audit = { record: vi.fn() };
const retention = () =>
  new RecordingRetention(
    settings as unknown as SettingsService,
    q as unknown as RecordingRetentionQueries,
    new RecordingEraser(admin as unknown as RecordingAdminQueries, storage as unknown as StorageService, audit as unknown as AuditService),
  );
const OLD = [{ id: 'R1', file_path: 'lessons/L/1.mp4' }, { id: 'R2', file_path: 'lessons/L/2.mp4' }];

beforeEach(() => {
  vi.resetAllMocks();
  settings.read.mockResolvedValue(undefined);
  q.failStuck.mockResolvedValue(0);
  q.expired.mockResolvedValue([]);
});

describe('retention: recording_retention_days', () => {
  it('unset, null, zero, fractional or text = keep forever: no query, no delete', async () => {
    for (const v of [undefined, null, 0, -3, 1.5, '30', true]) {
      settings.read.mockResolvedValue(v);
      expect(await retention().purgeExpired(NOW)).toBe(0);
    }
    expect(q.expired).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
    expect(settings.read).toHaveBeenCalledWith(RETENTION_KEY);
  });

  it('an unreadable setting keeps the recordings too', async () => {
    settings.read.mockRejectedValue(new Error('db down'));
    expect(await retention().purgeExpired(NOW)).toBe(0);
    expect(q.expired).not.toHaveBeenCalled();
  });

  it('with 30 days: files older than the cutoff are removed, rows marked deleted, audited by the system', async () => {
    settings.read.mockResolvedValue(30);
    q.expired.mockResolvedValueOnce(OLD);
    expect(await retention().purgeExpired(NOW)).toBe(2);
    expect(q.expired).toHaveBeenCalledWith({ cutoff: '2026-09-05T12:00:00.000Z', limit: 100 });
    expect(storage.remove.mock.calls.map(([r]) => r)).toEqual(OLD.map((r) => ({ bucket: 'recordings', path: r.file_path })));
    expect(admin.markDeleted.mock.calls.map(([id]) => id)).toEqual(['R1', 'R2']);
    expect(audit.record).toHaveBeenCalledWith({ actorId: null, entity: 'lesson_recordings', entityId: 'R1', action: 'retention_delete', after: { retention_days: 30 } });
  });

  it('is idempotent: a second run finds nothing left and changes nothing', async () => {
    settings.read.mockResolvedValue(30);
    q.expired.mockResolvedValueOnce(OLD).mockResolvedValue([]);
    expect(await retention().purgeExpired(NOW)).toBe(2);
    storage.remove.mockClear();
    expect(await retention().purgeExpired(NOW)).toBe(0);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('a failing file stays for the next run; the others still go', async () => {
    settings.read.mockResolvedValue(7);
    q.expired.mockResolvedValueOnce(OLD);
    storage.remove.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    expect(await retention().purgeExpired(NOW)).toBe(1);
    expect(admin.markDeleted.mock.calls.map(([id]) => id)).toEqual(['R2']);
  });
});

describe('stuck sweeper', () => {
  it('fails rows still recording after 6 hours', async () => {
    q.failStuck.mockResolvedValue(2);
    expect(await retention().sweepStuck(NOW)).toBe(2);
    expect(q.failStuck).toHaveBeenCalledWith({ cutoff: '2026-10-05T06:00:00.000Z', now: NOW.toISOString() });
  });
});

describe('RecordingMaintenanceJob.runOnce', () => {
  it('runs both sweeps and reports the counts', async () => {
    settings.read.mockResolvedValue(30);
    q.failStuck.mockResolvedValue(1);
    q.expired.mockResolvedValueOnce([OLD[0]]);
    expect(await new RecordingMaintenanceJob(retention()).runOnce(NOW)).toEqual({ stuck: 1, purged: 1 });
  });

  it('never throws: a failing sweep counts 0 and the other still runs', async () => {
    q.failStuck.mockRejectedValue(new Error('db'));
    settings.read.mockResolvedValue(30);
    q.expired.mockResolvedValueOnce([OLD[0]]);
    expect(await new RecordingMaintenanceJob(retention()).runOnce(NOW)).toEqual({ stuck: 0, purged: 1 });
  });
});
