import type { OffPathKeys } from './off-path.keys.types';

// Keys kept outside the API path roots on purpose (docs/57 G3). No write refreshes them:
// - a signed file link: invalidating ['threads'] or ['portal'] (every send, every opened chat)
//   would sign it again mid-play; it expires on its own staleTime instead;
// - the reply's lesson: read fresh (staleTime 0) each time its sheet opens, and the sheet closes
//   after the move; under ['lessons'] the move form's own refresh would empty the open sheet.

export const offPathKeys: OffPathKeys = {
  threadFile: (phone, messageId) => ['thread-file', phone, messageId],
  portalRecordingUrl: (studentId, recordingId) => ['portal-recording-url', studentId, recordingId],
  portalLessonFileUrl: (studentId, fileId) => ['portal-lesson-file-url', studentId, fileId],
  replyLesson: (flow, lessonId) => ['reply-lesson', flow, lessonId],
};
