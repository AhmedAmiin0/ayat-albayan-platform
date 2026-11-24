import type { PortalFileUrl, PortalLessonAssets, PortalRecordings } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { BUCKETS, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { PortalReportsRepo, PortalScopes } from '@/modules/people/portal';
import { portalLessonFile } from '@/modules/teaching/student-recordings/lesson-files/lesson-files.mapper';
import { LessonFilesRepo } from '@/modules/teaching/student-recordings/lesson-files/lesson-files.repo';
import { portalRecording } from './portal-assets.mapper';

interface StudentCall {
  user: AuthUser;
  studentId: string;
}

interface FileCall extends StudentCall {
  fileId: string;
  download?: string | undefined;
}

const saveAs = (call: FileCall): { download?: string } =>
  call.download ? { download: call.download } : {};

/** docs/31 scope (404 for another's student); assets reach the family once the report was sent. */
@Injectable()
export class PortalAssetsService {
  constructor(
    @Inject(PortalScopes) private readonly scopes: PortalScopes,
    @Inject(PortalReportsRepo) private readonly reports: PortalReportsRepo,
    @Inject(LessonFilesRepo) private readonly files: LessonFilesRepo,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** Newest first; every visible part of a lesson, each with its lesson's report id. */
  async recordings(call: StudentCall): Promise<PortalRecordings> {
    await this.scopes.student(call.user, call.studentId);
    const sent = await this.reports.sentLessons(call.studentId);
    const rows = await this.reports.visibleRecordings([...sent.keys()]);
    return { items: rows.map((r) => portalRecording(r, sent.get(r.lesson_id) ?? null)) };
  }

  /** 404 lesson_not_found unless the student attended it and its report was sent. */
  async lesson(call: StudentCall & { lessonId: string }): Promise<PortalLessonAssets> {
    await this.scopes.student(call.user, call.studentId);
    const reportId = (await this.reports.sentLessons(call.studentId)).get(call.lessonId);
    const lesson = reportId ? await this.files.lessonOf(call) : null;
    if (!lesson || !reportId) throw notFound('lesson_not_found');
    const [recordings, files] = await Promise.all([
      this.reports.visibleRecordings([lesson.id]),
      this.files.ofLesson({ lessonId: lesson.id, familyOnly: true }),
    ]);
    return {
      lesson_id: lesson.id,
      lesson_starts_at: lesson.starts_at,
      lesson_ends_at: lesson.ends_at,
      teacher: lesson.teacher,
      report_id: reportId,
      recordings: recordings.map((r) => portalRecording(r, reportId)),
      files: files.map(portalLessonFile),
    };
  }

  /**
   * A 1-hour link (an audio player range-reads it) to one visible file the family may open; with
   * `download` it saves under that name instead.
   */
  async fileUrl(call: FileCall): Promise<PortalFileUrl> {
    await this.scopes.student(call.user, call.studentId);
    const row = await this.files.byId(call.fileId);
    const sent = row?.visible_to_family ? await this.reports.sentLessons(call.studentId) : null;
    if (!row || !sent?.has(row.lesson_id)) throw notFound('lesson_file_not_found');
    const ref = { bucket: BUCKETS.attachments, path: row.storage_path };
    return this.storage.signedDownload({ ...ref, seconds: SIGNED_URL_SECONDS.ui, ...saveAs(call) });
  }
}
