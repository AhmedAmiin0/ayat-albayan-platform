import { LessonEndController } from './lesson-end.controller';
import { LessonEndRepo } from './lesson-end.repo';
import { LessonEndService } from './lesson-end.service';
import { LessonLiveRepo } from './lesson-live.repo';
import { LessonLivePush } from './lesson-live.push';
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
  RoomPresenceRepo,
  RoomPresenceService,
];
