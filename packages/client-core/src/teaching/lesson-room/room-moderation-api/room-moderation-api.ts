import { roomModerationRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { RoomModerationApi } from './room-moderation-api.types';

/** Room recordings and meeting controls; the app keeps its own query keys. */
export function roomModerationApi(client: ApiClient): RoomModerationApi {
  const call = callWith(client);
  return {
    lessonRecordings: (id) => call({ route: routes.lessonRecordings, params: { id } }),
    meetingRecordings: (id) => call({ route: routes.meetingRecordings, params: { id } }),
    recordingStatus: () => call({ route: routes.recordingStatus }),
    muteInMeeting: ({ meetingId, identity, source }) =>
      call({ route: routes.muteInMeeting, params: { id: meetingId, identity }, body: { source } }),
    shareInMeeting: ({ meetingId, identity, allow }) =>
      call({ route: routes.shareInMeeting, params: { id: meetingId, identity }, body: { allow } }),
  };
}
