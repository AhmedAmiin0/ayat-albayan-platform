import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import type { StorageService } from '../../common/storage/storage.service';
import type { RecordingAdminQueries, RecordingWithTeacher } from './recording-admin.queries';
import { RecordingDeleteService } from './recording-delete.service';
import { RecordingEraser } from './recording-eraser';
import { ADMIN, recording, REC_ID, TEACHER, TEACHER_ID } from './student-recordings.fakes';

const NOW = new Date('2026-10-06T08:00:00.000Z');
const row = (over: Partial<RecordingWithTeacher> = {}): RecordingWithTeacher => ({ ...recording(), lessons: { teacher_id: TEACHER_ID }, ...over });
const q = { byId: vi.fn(), markDeleted: vi.fn() };
const storage = { remove: vi.fn() };
const audit = { record: vi.fn() };
const service = () =>
  new RecordingDeleteService(
    q as unknown as RecordingAdminQueries,
    new RecordingEraser(q as unknown as RecordingAdminQueries, storage as unknown as StorageService, audit as unknown as AuditService),
  );

beforeEach(() => {
  vi.resetAllMocks();
  q.byId.mockResolvedValue(row());
});

describe('admin delete', () => {
  it('removes the file from the recordings bucket, marks the row, writes an audit row', async () => {
    await service().remove({ user: ADMIN, id: REC_ID }, NOW);
    expect(storage.remove).toHaveBeenCalledWith({ bucket: 'recordings', path: recording().file_path });
    expect(q.markDeleted).toHaveBeenCalledWith(REC_ID, NOW.toISOString());
    expect(audit.record).toHaveBeenCalledWith({
      actorId: ADMIN.id,
      entity: 'lesson_recordings',
      entityId: REC_ID,
      action: 'delete',
      before: { status: 'done', visible_to_student: false },
      after: { status: 'deleted' },
    });
  });

  it('only an admin: even the lesson’s teacher is refused before anything is touched', async () => {
    await expect(service().remove({ user: TEACHER, id: REC_ID })).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('a recording still running cannot be deleted; a deleted one is a quiet no-op', async () => {
    q.byId.mockResolvedValueOnce(row({ status: 'recording', ended_at: null }));
    await expect(service().remove({ user: ADMIN, id: REC_ID })).rejects.toBeInstanceOf(ConflictException);
    q.byId.mockResolvedValueOnce(row({ status: 'deleted', deleted_at: NOW.toISOString() }));
    await service().remove({ user: ADMIN, id: REC_ID });
    expect(storage.remove).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('a failed storage call leaves the row and writes no audit row', async () => {
    storage.remove.mockRejectedValue(new Error('storage remove failed'));
    await expect(service().remove({ user: ADMIN, id: REC_ID })).rejects.toThrow('storage remove failed');
    expect(q.markDeleted).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
