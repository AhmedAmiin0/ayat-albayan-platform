import type { LessonAssets } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { BUCKETS, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { LessonAssetsRepo, type AssetRecordingRow } from './lesson-assets.repo';
import { LessonFilesAccess } from './lesson-files.access';
import { assetRecording, assetReport, lessonFileView } from './lesson-files.mapper';
import { LessonFilesRepo } from './lesson-files.repo';

const NONE: ReadonlyMap<string, string> = new Map();

/** GET /lessons/:id/files: the lesson's recordings, reports and files on one staff page. */
@Injectable()
export class LessonAssetsService {
  constructor(
    @Inject(LessonFilesAccess) private readonly access: LessonFilesAccess,
    @Inject(LessonFilesRepo) private readonly files: LessonFilesRepo,
    @Inject(LessonAssetsRepo) private readonly assets: LessonAssetsRepo,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  async of(input: { user: AuthUser; lessonId: string }): Promise<LessonAssets> {
    const lesson = await this.access.lesson(input.user, input.lessonId);
    const [students, reports, recordings, files] = await Promise.all([
      this.assets.students(lesson.id),
      this.assets.reports(lesson.id),
      this.assets.recordings(lesson.id),
      this.files.ofLesson({ lessonId: lesson.id, familyOnly: false }),
    ]);
    return {
      lesson_id: lesson.id,
      starts_at: lesson.starts_at,
      ends_at: lesson.ends_at,
      students,
      recordings: await this.signed(recordings),
      reports: reports.filter((r) => r.status === 'submitted').map((r) => assetReport(r, students)),
      files: files.map(lessonFileView),
    };
  }

  /** A finished file that cannot be signed fails the page, as a single link did. */
  private async signed(rows: readonly AssetRecordingRow[]) {
    const done = rows.filter((r) => r.status === 'done');
    const paths = done.map((r) => r.file_path);
    const sign = { bucket: BUCKETS.recordings, paths, seconds: SIGNED_URL_SECONDS.ui };
    const urls = done.length === 0 ? NONE : await this.storage.signedDownloads(sign);
    if (done.some((r) => !urls.has(r.file_path))) throw new Error('lesson recording not signed');
    return rows.map((r) => assetRecording(r, urls.get(r.file_path) ?? null));
  }
}
