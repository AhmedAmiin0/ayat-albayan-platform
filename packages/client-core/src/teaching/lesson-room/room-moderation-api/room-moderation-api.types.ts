import type { RouteResult } from '@ab/core';
import type { MuteSource, roomModerationRoutes } from '@ab/schedule';

type Routes = typeof roomModerationRoutes;
type Answer<K extends keyof Routes> = Promise<RouteResult<Routes[K]>>;

export interface MeetingMute {
  meetingId: string;
  identity: string;
  source: MuteSource;
}

export interface RoomModerationApi {
  /** Newest first, with 1-hour links to the finished files. */
  lessonRecordings: (lessonId: string) => Answer<'lessonRecordings'>;
  meetingRecordings: (meetingId: string) => Answer<'meetingRecordings'>;
  recordingStatus: () => Answer<'recordingStatus'>;
  /** 204; 403 cannot_mute, 404 participant_not_found. */
  muteInMeeting: (input: MeetingMute) => Promise<void>;
}
