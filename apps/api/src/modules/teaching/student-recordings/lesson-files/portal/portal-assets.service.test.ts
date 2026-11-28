import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import type { PortalRecordingRow, PortalReportsRepo, PortalScopes } from '@/modules/people/portal';
import {
  FILE,
  fileRow,
  GUARDIAN,
  LESSON,
} from '@/modules/teaching/student-recordings/lesson-files/lesson-files.fakes';
import type { LessonFilesRepo } from '@/modules/teaching/student-recordings/lesson-files/lesson-files.repo';
import { PortalAssetsService } from './portal-assets.service';

const S = 'S1';
const scopes = { student: vi.fn() };
const reports = { sentLessons: vi.fn(), visibleRecordings: vi.fn() };
const files = { ofLesson: vi.fn(), byId: vi.fn(), lessonOf: vi.fn() };
const storage = { signedDownload: vi.fn() };
const service = () =>
  new PortalAssetsService(
    scopes as unknown as PortalScopes,
    reports as unknown as PortalReportsRepo,
    files as unknown as LessonFilesRepo,
    storage as unknown as StorageService,
  );
const rec: PortalRecordingRow = {
  id: 'R',
  lesson_id: LESSON,
  file_path: 'secret/r.mp3',
  started_at: '2026-11-16T16:00:00.000Z',
  ended_at: '2026-11-16T16:44:00.000Z',
  size_bytes: 21,
  lesson: { starts_at: 'x', teacher: null },
};

beforeEach(() => {
  vi.resetAllMocks();
  reports.sentLessons.mockResolvedValue(new Map([[LESSON, 'REP']]));
  reports.visibleRecordings.mockResolvedValue([rec]);
});

describe('PortalAssetsService.recordings', () => {
  it('lists visible recordings of sent lessons, with the report id and no path', async () => {
    const out = await service().recordings({ user: GUARDIAN, studentId: S });
    expect(scopes.student).toHaveBeenCalledWith(GUARDIAN, S);
    expect(reports.visibleRecordings).toHaveBeenCalledWith([LESSON]);
    expect(out.items[0]).toMatchObject({ id: 'R', report_id: 'REP', duration_seconds: 2640 });
    expect(JSON.stringify(out)).not.toContain('secret');
  });
});

describe('PortalAssetsService.lesson', () => {
  it('ties the report, the recordings and the visible files of a sent lesson', async () => {
    files.lessonOf.mockResolvedValue({ id: LESSON, starts_at: 'a', ends_at: 'b', teacher: null });
    files.ofLesson.mockResolvedValue([fileRow()]);
    const out = await service().lesson({ user: GUARDIAN, studentId: S, lessonId: LESSON });
    expect(out.report_id).toBe('REP');
    expect(out.files).toHaveLength(1);
    expect(files.ofLesson).toHaveBeenCalledWith({ lessonId: LESSON, familyOnly: true });
  });

  it('answers 404 before the report was sent', async () => {
    reports.sentLessons.mockResolvedValue(new Map());
    await expect(
      service().lesson({ user: GUARDIAN, studentId: S, lessonId: LESSON }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PortalAssetsService.fileUrl', () => {
  it('signs a visible file of a sent lesson', async () => {
    files.byId.mockResolvedValue(fileRow());
    await service().fileUrl({ user: GUARDIAN, studentId: S, fileId: FILE });
    expect(storage.signedDownload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'report-attachments', path: `${LESSON}/a.png` }),
    );
  });

  it('«تنزيل»: the same link saving under the asked name', async () => {
    files.byId.mockResolvedValue(fileRow());
    await service().fileUrl({ user: GUARDIAN, studentId: S, fileId: FILE, download: 'ورقة.png' });
    expect(storage.signedDownload).toHaveBeenCalledWith(
      expect.objectContaining({ path: `${LESSON}/a.png`, download: 'ورقة.png' }),
    );
  });

  it('hides a file staff kept from the family', async () => {
    files.byId.mockResolvedValue(fileRow({ visible_to_family: false }));
    await expect(
      service().fileUrl({ user: GUARDIAN, studentId: S, fileId: FILE }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });
});
