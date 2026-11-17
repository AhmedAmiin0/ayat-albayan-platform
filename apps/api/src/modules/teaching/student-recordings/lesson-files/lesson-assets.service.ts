import type { LessonAssets } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { BUCKETS, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { LessonAssetsRepo, type AssetRecordingRow } from './lesson-assets.repo';
import { LessonFilesAccess } from './lesson-files.access';
import { assetRecording, assetReport, lessonFileView } from './lesson-files.mapper';
import { LessonFilesRepo } from './lesson-files.repo';

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
      recordings: await Promise.all(recordings.map((r) => this.signed(r))),
      reports: reports.filter((r) => r.status === 'submitted').map((r) => assetReport(r, students)),
      files: files.map(lessonFileView),
    };
  }

  private async signed(row: AssetRecordingRow) {
    const url = row.status === 'done' ? await this.sign(row.file_path) : null;
    return assetRecording(row, url);
  }

  private async sign(path: string): Promise<string> {
    const ref = { bucket: BUCKETS.recordings, path, seconds: SIGNED_URL_SECONDS.ui };
    return (await this.storage.signedDownload(ref)).url;
  }
}
