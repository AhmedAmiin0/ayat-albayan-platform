import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { lessonEndResultSchema } from '../room-state';
import { muteSchema, shareGrantSchema } from '../schemas';
import { lessonRecordingViewSchema, recordingStatusSchema } from './moderation.schemas';

const byRoom = z.object({ id: z.uuid() });
/** Any text: the api answers its own 404 for an identity it never minted. */
const byParticipant = byRoom.extend({ identity: z.string() });
const recordings = z.array(lessonRecordingViewSchema);
const lessonParticipant = '/lessons/:id/room/participants/:identity';
const meetingParticipant = '/meetings/:id/participants/:identity';

/** Staff controls in a lesson or meeting room, and its recordings; the writes answer 204. */
export const roomModerationRoutes = {
  removeFromLesson: defineRoute({
    method: 'POST',
    path: `${lessonParticipant}/remove`,
    params: byParticipant,
    response: 'empty',
  }),
  muteInLesson: defineRoute({
    method: 'POST',
    path: `${lessonParticipant}/mute`,
    params: byParticipant,
    body: muteSchema,
    response: 'empty',
  }),
  muteInMeeting: defineRoute({
    method: 'POST',
    path: `${meetingParticipant}/mute`,
    params: byParticipant,
    body: muteSchema,
    response: 'empty',
  }),
  shareInLesson: defineRoute({
    method: 'POST',
    path: `${lessonParticipant}/share`,
    params: byParticipant,
    body: shareGrantSchema,
    response: 'empty',
  }),
  shareInMeeting: defineRoute({
    method: 'POST',
    path: `${meetingParticipant}/share`,
    params: byParticipant,
    body: shareGrantSchema,
    response: 'empty',
  }),
  /** Newest first, with 1-hour links to the finished files. */
  lessonRecordings: defineRoute({
    method: 'GET',
    path: '/lessons/:id/recordings',
    params: byRoom,
    response: recordings,
  }),
  meetingRecordings: defineRoute({
    method: 'GET',
    path: '/meetings/:id/recordings',
    params: byRoom,
    response: recordings,
  }),
  recordingStatus: defineRoute({
    method: 'GET',
    path: '/recordings/status',
    response: recordingStatusSchema,
  }),
  /** Idempotent: the first end's time. */
  endLesson: defineRoute({
    method: 'POST',
    path: '/lessons/:id/end',
    params: byRoom,
    response: lessonEndResultSchema,
  }),
};
