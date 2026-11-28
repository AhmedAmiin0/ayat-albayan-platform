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
const tags = ['classroom'] as const;
const reads = { permissions: ['assistants.read'], tags } as const;
const writes = { permissions: ['assistants.write'], tags } as const;

/** Assistants per student (admin); an assistant reads only their own students' sessions. */
export const assistantsRoutes = {
  all: defineRoute({
    method: 'GET',
    path: '/assistants',
    response: assistantList,
    ...reads,
  }),
  mine: defineRoute({
    method: 'GET',
    path: '/assistants/me/lessons',
    query: assistantDaySchema,
    response: z.array(assistantLessonViewSchema),
    permissions: ['self.assistant'], tags,
  }),
  forStudent: defineRoute({
    method: 'GET',
    path: '/students/:id/assistants',
    params: byStudent,
    response: assistantList,
    ...reads,
  }),
  /** Idempotent; answers the student's new list. */
  assign: defineRoute({
    method: 'POST',
    path: '/students/:id/assistants',
    params: byStudent,
    body: assignAssistantSchema,
    response: assistantList,
    ...writes,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/students/:id/assistants/:profileId',
    params: byStudent.extend({ profileId: z.uuid() }),
    response: assistantList,
    ...writes,
  }),
};
