import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  assignAssistantSchema,
  assistantDaySchema,
  assistantLessonViewSchema,
  assistantViewSchema,
} from './assistants.schemas';

const byStudent = z.object({ id: z.uuid() });
const assistantList = z.array(assistantViewSchema);

/** Assistants per student (admin); an assistant reads only their own students' sessions. */
export const assistantsRoutes = {
  all: defineRoute({ method: 'GET', path: '/assistants', response: assistantList }),
  mine: defineRoute({
    method: 'GET',
    path: '/assistants/me/lessons',
    query: assistantDaySchema,
    response: z.array(assistantLessonViewSchema),
  }),
  forStudent: defineRoute({
    method: 'GET',
    path: '/students/:id/assistants',
    params: byStudent,
    response: assistantList,
  }),
  /** Idempotent; answers the student's new list. */
  assign: defineRoute({
    method: 'POST',
    path: '/students/:id/assistants',
    params: byStudent,
    body: assignAssistantSchema,
    response: assistantList,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/students/:id/assistants/:profileId',
    params: byStudent.extend({ profileId: z.uuid() }),
    response: assistantList,
  }),
};
