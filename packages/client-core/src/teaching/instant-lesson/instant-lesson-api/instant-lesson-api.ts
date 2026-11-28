import { meetingRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { InstantLessonCall } from './instant-lesson-api.types';

/** POST /lessons/instant (R-MEET-01) on one api client; the answer is parsed strictly. */
export function instantLessonCall(client: ApiClient): InstantLessonCall {
  const call = callWith(client);
  return (body) => call({ route: meetingRoutes.instant, body });
}
