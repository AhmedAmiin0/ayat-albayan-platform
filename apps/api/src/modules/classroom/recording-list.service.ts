import type { LessonRecordingView } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { BUCKETS, SIGNED_URL_SECONDS } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { LessonRoleService } from './lesson-role.service';
import { RecordingQueries, type RecordingRow } from './recording.queries';

const STATUSES = ['recording', 'done', 'failed'] as const;
type Status = LessonRecordingView['status'];
const asStatus = (s: string): Status => STATUSES.find((x) => x === s) ?? 'failed';

/** A row as the clients see it; `url` only for a finished file. */
export function recordingView(row: RecordingRow, url: string | null): LessonRecordingView {
  const status = asStatus(row.status);
  return { id: row.id, status, started_at: row.started_at, ended_at: row.ended_at, url: status === 'done' ? url : null };
}

/** GET /lessons/:id/recordings: the admin and the lesson's own teacher; newest first, 1-hour links. */
@Injectable()
export class RecordingListService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly queries: RecordingQueries,
    private readonly storage: StorageService,
  ) {}

  async list(input: { user: AuthUser; lessonId: string }): Promise<LessonRecordingView[]> {
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (role !== 'admin' && role !== 'teacher') throw new ForbiddenException();
    const rows = await this.queries.forLesson(lesson.id);
    return Promise.all(rows.map(async (row) => recordingView(row, row.status === 'done' ? await this.urlOf(row) : null)));
  }

  private async urlOf(row: RecordingRow): Promise<string> {
    const signed = await this.storage.signedDownload({ bucket: BUCKETS.recordings, path: row.file_path, seconds: SIGNED_URL_SECONDS.ui });
    return signed.url;
  }
}
