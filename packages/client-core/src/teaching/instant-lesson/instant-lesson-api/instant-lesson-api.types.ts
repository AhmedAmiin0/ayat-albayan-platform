import type { InstantLessonRequest, InstantLessonResult } from '@ab/schedule';

export type InstantLessonCall = (body: InstantLessonRequest) => Promise<InstantLessonResult>;
