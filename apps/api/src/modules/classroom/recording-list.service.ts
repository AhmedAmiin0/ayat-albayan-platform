import type { LessonRecordingView } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { BUCKETS, SIGNED_URL_SECONDS } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { notFound } from '../scheduling/errors';
import { InternalMeetingsQueries } from './internal-meetings.queries';
import { canManageMeeting } from './internal-meetings.token';
import { LessonRoleService } from './lesson-role.service';
import { RecordingQueries, type RecordingRow } from './recording.queries';
import { lessonTarget, meetingTarget, type RoomTarget } from './recording-target';

const STATUSES = ['recording', 'done', 'failed'] as const;
type Status = LessonRecordingView['status'];
const asStatus = (s: string): Status => STATUSES.find((x) => x === s) ?? 'failed';

/** A row as the clients see it; `url` only for a finished file. */
export function recordingView(row: RecordingRow, url: string | null): LessonRecordingView {
  const status = asStatus(row.status);
  return { id: row.id, status, started_at: row.started_at, ended_at: row.ended_at, url: status === 'done' ? url : null };
}

/** A room's recordings, newest first, with 1-hour signed links to the finished files. */
@Injectable()
export class RecordingViews {
  constructor(
    private readonly queries: RecordingQueries,
    private readonly storage: StorageService,
  ) {}

  async of(target: RoomTarget): Promise<LessonRecordingView[]> {
    const rows = await this.queries.forTarget(target);
    return Promise.all(rows.map(async (row) => recordingView(row, row.status === 'done' ? await this.urlOf(row) : null)));
  }

  private async urlOf(row: RecordingRow): Promise<string> {
    const signed = await this.storage.signedDownload({ bucket: BUCKETS.recordings, path: row.file_path, seconds: SIGNED_URL_SECONDS.ui });
    return signed.url;
  }
}

/** GET /lessons/:id/recordings: the admin and the lesson's own teacher. */
@Injectable()
export class RecordingListService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly views: RecordingViews,
  ) {}

  async list(input: { user: AuthUser; lessonId: string }): Promise<LessonRecordingView[]> {
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (role !== 'admin' && role !== 'teacher') throw new ForbiddenException();
    return this.views.of(lessonTarget(lesson.id));
  }
}

/** GET /meetings/:id/recordings: any admin and the meeting's creator (migration 212's RLS rule). */
@Injectable()
export class MeetingRecordingListService {
  constructor(
    private readonly meetings: InternalMeetingsQueries,
    private readonly views: RecordingViews,
  ) {}

  /** 404 meeting_not_found, 403 anyone else. */
  async list(input: { user: AuthUser; id: string }): Promise<LessonRecordingView[]> {
    const meeting = await this.meetings.byId(input.id);
    if (!meeting) throw notFound('meeting_not_found');
    if (!canManageMeeting(input.user, meeting)) throw new ForbiddenException();
    return this.views.of(meetingTarget(meeting.id));
  }
}
