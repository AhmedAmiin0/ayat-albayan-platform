import { LessonEndController } from './lesson-end.controller';
import { LessonEndRepo } from './lesson-end.repo';
import { LessonEndService } from './lesson-end.service';
import { LessonLiveRepo } from './lesson-live.repo';
import { LessonLivePush } from './lesson-live.push';
import { RoomPresenceRepo } from './room-presence.repo';
import { RoomPresenceService } from './room-presence.service';

// The live lesson room: end for everyone, current presence and the lesson-started push.

export const LIVE_ROOM_CONTROLLERS = [LessonEndController];

export const LIVE_ROOM_PROVIDERS = [
  LessonEndRepo,
  LessonEndService,
  LessonLiveRepo,
  LessonLivePush,
  RoomPresenceRepo,
  RoomPresenceService,
];
