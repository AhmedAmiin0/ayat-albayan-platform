import { lessonProposeRoutes } from '@ab/schedule';
import { callWith, type ApiClient } from '../../../core/http';
import type { TeacherProposalCalls } from './proposal-calls.types';

/** The teacher's proposal of another time; the answer is parsed strictly. */
export function teacherProposalCalls(client: ApiClient): TeacherProposalCalls {
  const call = callWith(client);
  return {
    propose: (params, body) => call({ route: lessonProposeRoutes.propose, params, body }),
  };
}
