import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import type { LessonFilesAccess } from './lesson-files.access';
import { FILE, fileRow, LESSON, lessonRef, TEACHER } from './lesson-files.fakes';
import type { LessonFilesRepo } from './lesson-files.repo';
import { LessonFilesService } from './lesson-files.service';

const access = { lesson: vi.fn() };
const repo = { add: vi.fn(), byId: vi.fn(), setVisible: vi.fn(), remove: vi.fn() };
const storage = {
  signedUpload: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
  signedDownload: vi.fn(),
};
const service = () =>
  new LessonFilesService(
    access as unknown as LessonFilesAccess,
    repo as unknown as LessonFilesRepo,
    storage as unknown as StorageService,
  );
const file = { mime: 'application/pdf' as const, size: 10, kind: 'homework' as const };

beforeEach(() => {
  vi.resetAllMocks();
  access.lesson.mockResolvedValue(lessonRef());
  repo.byId.mockResolvedValue(fileRow());
});

describe('LessonFilesService uploads', () => {
  it('signs an upload under the lesson in the report-attachments bucket', async () => {
    await service().uploadUrl({ user: TEACHER, id: LESSON, file });
    const slot = storage.signedUpload.mock.calls[0]?.[0] as { bucket: string; path: string };
    expect(slot.bucket).toBe('report-attachments');
    expect(slot.path).toMatch(new RegExp(`^${LESSON}/[0-9a-f-]+\\.pdf$`));
  });

  it('registers an uploaded object of this lesson, visible by default', async () => {
    storage.exists.mockResolvedValue(true);
    repo.add.mockResolvedValue(fileRow({ mime: 'application/pdf' }));
    const body = { ...file, path: `${LESSON}/x.pdf`, visible_to_family: true };
    const view = await service().register({ user: TEACHER, id: LESSON, file: body });
    expect(view.media).toBe('pdf');
    const row = expect.objectContaining({ lesson_id: LESSON, created_by: TEACHER.id });
    expect(repo.add).toHaveBeenCalledWith(row);
  });

  it('refuses a path of another lesson or one never uploaded', async () => {
    storage.exists.mockResolvedValue(false);
    const other = { ...file, path: 'other/x.pdf', visible_to_family: true };
    await expect(
      service().register({ user: TEACHER, id: LESSON, file: other }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const missing = { ...other, path: `${LESSON}/x.pdf` };
    await expect(
      service().register({ user: TEACHER, id: LESSON, file: missing }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.add).not.toHaveBeenCalled();
  });
});

describe('LessonFilesService on one file', () => {
  it('removes the object, then the row, behind the lesson gate', async () => {
    await service().remove({ user: TEACHER, id: FILE });
    expect(access.lesson).toHaveBeenCalledWith(TEACHER, LESSON);
    const ref = { bucket: 'report-attachments', path: `${LESSON}/a.png` };
    expect(storage.remove).toHaveBeenCalledWith(ref);
    expect(repo.remove).toHaveBeenCalledWith(FILE);
  });

  it('turns the family view off', async () => {
    repo.setVisible.mockResolvedValue(fileRow({ visible_to_family: false }));
    const view = await service().setVisible({ user: TEACHER, id: FILE, visible: false });
    expect(view.visible_to_family).toBe(false);
  });

  it('answers 404 for an unknown file', async () => {
    repo.byId.mockResolvedValue(null);
    await expect(service().url({ user: TEACHER, id: FILE })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
