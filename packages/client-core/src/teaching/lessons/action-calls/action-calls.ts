import { lessonActionRoutes as routes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { LessonActionCalls } from './action-calls.types';

/** Confirm, outcome, cancel and correction of one lesson; answers parsed strictly. */
export function lessonActionCalls(client: ApiClient): LessonActionCalls {
  const call = callWith(client);
  return {
    confirm: (params) => call({ route: routes.confirm, params }),
    status: (params, body) => call({ route: routes.status, params, body }),
    cancel: (params, body) => call({ route: routes.cancel, params, body }),
    correct: (params, body) => call({ route: routes.correct, params, body }),
  };
}
