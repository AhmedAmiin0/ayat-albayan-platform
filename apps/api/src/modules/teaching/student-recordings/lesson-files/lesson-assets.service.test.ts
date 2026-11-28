import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import type { LessonAssetsRepo } from './lesson-assets.repo';
import { LessonAssetsService } from './lesson-assets.service';
import type { LessonFilesAccess } from './lesson-files.access';
import { ADMIN, fileRow, LESSON, lessonRef } from './lesson-files.fakes';
import type { LessonFilesRepo } from './lesson-files.repo';

const rec = (status: string) => ({
  id: status,
  lesson_id: LESSON,
  meeting_id: null,
  egress_id: null,
  error: null,
  deleted_at: null,
  file_path: 'p.mp3',
  started_at: '2026-11-16T16:00:00.000Z',
  ended_at: null,
  size_bytes: null,
  status,
  visible_to_student: false,
});

describe('LessonAssetsService', () => {
  it('signs finished recordings only and keeps submitted reports', async () => {
    const assets = {
      students: vi.fn().mockResolvedValue([{ id: 'S', name: 'سلمى', code: null }]),
      reports: vi.fn().mockResolvedValue([
        { id: 'A', student_id: 'S', pdf_status: 'ready', sent_at: null, status: 'submitted' },
        { id: 'B', student_id: 'S', pdf_status: 'pending', sent_at: null, status: 'draft' },
      ]),
      recordings: vi.fn().mockResolvedValue([rec('done'), rec('recording')]),
    };
    const storage = { signedDownloads: vi.fn().mockResolvedValue(new Map([['p.mp3', 'u']])) };
    const service = new LessonAssetsService(
      { lesson: vi.fn().mockResolvedValue(lessonRef()) } as unknown as LessonFilesAccess,
      { ofLesson: vi.fn().mockResolvedValue([fileRow()]) } as unknown as LessonFilesRepo,
      assets as unknown as LessonAssetsRepo,
      storage as unknown as StorageService,
    );
    const out = await service.of({ user: ADMIN, lessonId: LESSON });
    expect(out.recordings.map((r) => r.url)).toEqual(['u', null]);
    expect(storage.signedDownloads).toHaveBeenCalledTimes(1);
    const one = { bucket: 'recordings', paths: ['p.mp3'], seconds: 3600 };
    expect(storage.signedDownloads).toHaveBeenCalledWith(one);
    expect(out.reports.map((r) => r.id)).toEqual(['A']);
    expect(out.files).toHaveLength(1);
  });
});
