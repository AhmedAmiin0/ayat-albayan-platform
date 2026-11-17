import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import type { StorageService } from '@/common/storage/storage.service';
import type { RecordingAdminRepo } from '@/modules/teaching/student-recordings/recording-admin.repo';
import { RecordingEraser } from './recording-eraser';

const q = { markDeleted: vi.fn() };
const storage = { remove: vi.fn() };
const audit = { record: vi.fn() };
const eraser = () =>
  new RecordingEraser(
    q as unknown as RecordingAdminRepo,
    storage as unknown as StorageService,
    audit as unknown as AuditService,
  );
const NOW = new Date('2026-11-17T08:00:00.000Z');
const input = (filePath: string) => ({
  id: 'r1',
  filePath,
  actorId: null,
  now: NOW,
  audit: { action: 'retention', after: { status: 'deleted' } },
});

beforeEach(() => {
  vi.resetAllMocks();
  q.markDeleted.mockResolvedValue(1);
  storage.remove.mockResolvedValue(undefined);
});

// REC-4: a deleted recording leaves no copy behind in the other store.
describe('RecordingEraser copies', () => {
  it('a «minio:» recording: the MinIO object and its Supabase original under the same key', async () => {
    expect(await eraser().erase(input('minio:l1/r1.mp4'))).toBe(true);
    expect(storage.remove.mock.calls).toEqual([
      [{ bucket: 'recordings', path: 'minio:l1/r1.mp4' }],
      [{ bucket: 'recordings', path: 'l1/r1.mp4' }],
    ]);
  });

  it('a Supabase recording: one remove (StorageService drops its MinIO twin itself)', async () => {
    await eraser().erase(input('l1/r1.mp4'));
    expect(storage.remove).toHaveBeenCalledOnce();
  });

  it('a failing copy delete is logged, never fails the erase', async () => {
    storage.remove.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('down'));
    expect(await eraser().erase(input('minio:l1/r1.mp4'))).toBe(true);
    expect(q.markDeleted).toHaveBeenCalledWith('r1', NOW.toISOString());
  });
});
