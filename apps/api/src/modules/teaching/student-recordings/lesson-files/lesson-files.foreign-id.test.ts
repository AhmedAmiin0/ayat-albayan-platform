import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import type { TeachersRepo } from '@/modules/people/teachers';
import { LessonAssetsService } from './lesson-assets.service';
import type { LessonAssetsRepo } from './lesson-assets.repo';
import { LessonFilesAccess } from './lesson-files.access';
import {
  FILE,
  fileRow,
  LESSON,
  lessonRef,
  OTHER_TEACHER,
  teachersFake,
} from './lesson-files.fakes';
import type { LessonFilesRepo } from './lesson-files.repo';
import { LessonFilesService } from './lesson-files.service';

const files = {
  lesson: vi.fn(),
  byId: vi.fn(),
  ofLesson: vi.fn(),
  add: vi.fn(),
  setVisible: vi.fn(),
  remove: vi.fn(),
};
const assets = { students: vi.fn(), reports: vi.fn(), recordings: vi.fn() };
const storage = {
  signedUpload: vi.fn(),
  exists: vi.fn(),
  remove: vi.fn(),
  signedDownload: vi.fn(),
};
const upload = { mime: 'application/pdf' as const, size: 10, kind: 'homework' as const };

const wired = () => {
  const repo = files as unknown as LessonFilesRepo;
  const access = new LessonFilesAccess(repo, teachersFake() as unknown as TeachersRepo);
  const store = storage as unknown as StorageService;
  return {
    files: new LessonFilesService(access, repo, store),
    assets: new LessonAssetsService(access, repo, assets as unknown as LessonAssetsRepo, store),
  };
};

/** Each lesson-files handler's call, as another teacher sends it for this lesson or its file. */
const CALLS: Record<string, (s: ReturnType<typeof wired>) => Promise<unknown>> = {
  'GET /lessons/:id/files': (s) => s.assets.of({ user: OTHER_TEACHER, lessonId: LESSON }),
  'POST /lessons/:id/files/upload-url': (s) =>
    s.files.uploadUrl({ user: OTHER_TEACHER, id: LESSON, file: upload }),
  'POST /lessons/:id/files': (s) =>
    s.files.register({
      user: OTHER_TEACHER,
      id: LESSON,
      file: { ...upload, path: `${LESSON}/a.pdf`, visible_to_family: true },
    }),
  'PATCH /lesson-files/:id/visibility': (s) =>
    s.files.setVisible({ user: OTHER_TEACHER, id: FILE, visible: false }),
  'DELETE /lesson-files/:id': (s) => s.files.remove({ user: OTHER_TEACHER, id: FILE }),
  'POST /lesson-files/:id/url': (s) => s.files.url({ user: OTHER_TEACHER, id: FILE }),
};

// The files of a lesson belong to its own teacher: another teacher gets 403 before any read,
// signed link or write.
describe('lesson files: another teacher’s lesson', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    files.lesson.mockResolvedValue(lessonRef());
    files.byId.mockResolvedValue(fileRow());
  });

  it.each(Object.entries(CALLS))('%s is 403', async (_route, call) => {
    await expect(call(wired())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reads, signs and writes nothing for another teacher', async () => {
    for (const call of Object.values(CALLS)) await call(wired()).catch(() => undefined);
    for (const fn of [files.ofLesson, files.add, files.setVisible, files.remove]) {
      expect(fn).not.toHaveBeenCalled();
    }
    for (const fn of [...Object.values(assets), ...Object.values(storage)]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
