export type ReplyLessonFlow = 'sales' | 'admin';

type Key<A, B> = (a: A, b: B) => string[];

export interface OffPathKeys {
  threadFile: Key<string, string>;
  portalRecordingUrl: Key<string, string>;
  portalLessonFileUrl: Key<string, string>;
  replyLesson: Key<ReplyLessonFlow, string>;
}
