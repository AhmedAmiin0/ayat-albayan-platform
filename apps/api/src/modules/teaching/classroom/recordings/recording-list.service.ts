import type { LessonRecordingView } from '@ab/schedule';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { BUCKETS, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { notFound } from '@/common/http/errors';
import { InternalMeetingsRepo } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.repo';
import { canManageMeeting } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.token';
import { LessonRoleService } from '@/modules/teaching/classroom/join/lesson-role.service';
import { RecordingRepo, type ListedRecording } from './recording.repo';
import { toRecordingView } from './recording.mapper';
import { lessonTarget, meetingTarget, type RoomTarget } from './recording-target';

type SignableRecording = Pick<ListedRecording, 'id' | 'status' | 'file_path'>;

const isDone = (row: SignableRecording): boolean => row.status === 'done';

const linkOf = (row: SignableRecording, urls: ReadonlyMap<string, string>): [string, string][] => {
  const url = urls.get(row.file_path);
  return url === undefined ? [] : [[row.id, url]];
};

/** A room's recordings, newest first, with 1-hour signed links to the finished files. */
@Injectable()
export class RecordingViews {
  constructor(
    private readonly queries: RecordingRepo,
    private readonly storage: StorageService,
  ) {}

  async of(target: RoomTarget): Promise<LessonRecordingView[]> {
    const rows = await this.queries.forTarget(target);
    const urls = await this.urlsOf(rows);
    return rows.map((row) => toRecordingView(row, urls.get(row.id) ?? null));
  }

  /**
   * 1-hour links to the finished rows' files by row id, signed in one call (the caller checked who
   * may see them). A finished file that cannot be signed fails the read, as a single link did.
   */
  async urlsOf(rows: readonly SignableRecording[]): Promise<Map<string, string>> {
    const done = rows.filter(isDone);
    if (done.length === 0) return new Map();
    const paths = done.map((r) => r.file_path);
    const sign = { bucket: BUCKETS.recordings, paths, seconds: SIGNED_URL_SECONDS.ui };
    const urls = await this.storage.signedDownloads(sign);
    const unsigned = done.find((r) => !urls.has(r.file_path));
    if (unsigned) throw new Error(`recording ${unsigned.id}: file not signed`);
    return new Map(done.flatMap((r) => linkOf(r, urls)));
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
    private readonly meetings: InternalMeetingsRepo,
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
