import { LessonEndController } from './lesson-end.controller';
import { LessonEndRepo } from './lesson-end.repo';
import { LessonEndService } from './lesson-end.service';
import { LessonLiveRepo } from './lesson-live.repo';
import { LessonLivePush } from './lesson-live.push';
import { LessonRoomStates } from './lesson-room-states';
import { RoomPresenceRepo } from './room-presence.repo';
import { RoomPresenceService } from './room-presence.service';

// The live lesson room (owner 2026-11-16): «إنهاء الحلقة للجميع», who is inside now (LiveKit's
// participant webhooks) and «بدأت الحلقة». Listed here so ClassroomModule stays readable.

export const LIVE_ROOM_CONTROLLERS = [LessonEndController];

export const LIVE_ROOM_PROVIDERS = [
  LessonEndRepo,
  LessonEndService,
  LessonLiveRepo,
  LessonLivePush,
  LessonRoomStates,
  RoomPresenceRepo,
  RoomPresenceService,
];

/** What the lesson rows (LessonsModule) and the portal read: the `room` of each lesson. */
export const ROOM_STATE_PROVIDERS = [RoomPresenceRepo, LessonRoomStates];
