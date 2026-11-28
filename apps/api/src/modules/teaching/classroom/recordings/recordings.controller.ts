import { roomModerationRoutes as routes } from '@ab/schedule';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { MeetingRecordingListService } from './recording-list.service';
import { RecordingStarter } from './recording.starter';

/** Recordings of an internal meeting: the admin and the creator; 1-hour links to finished files. */
@ApiBearerAuth()
@Controller()
export class MeetingRecordingsController {
  constructor(private readonly recordings: MeetingRecordingListService) {}

  /** Newest first; 404 meeting_not_found, 403 anyone but an admin or the creator. */
  @Route(routes.meetingRecordings)
  list(
    @RouteInput() { params }: RouteInputOf<typeof routes.meetingRecordings>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recordings.list({ user, id: params.id });
  }
}

/** Whether rooms can be recorded at all, so the panels can warn that recording is disabled. */
@ApiBearerAuth()
@Controller()
export class RecordingStatusController {
  constructor(private readonly starter: RecordingStarter) {}

  @Route(routes.recordingStatus)
  status() {
    return { configured: this.starter.configured };
  }
}
