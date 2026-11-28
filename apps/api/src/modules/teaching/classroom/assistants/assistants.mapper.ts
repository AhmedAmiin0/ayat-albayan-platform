import {
  assistantLessonViewSchema,
  assistantViewSchema,
  type AssistantLessonView,
  type AssistantView,
} from '@ab/schedule';
import type { z } from 'zod';
import { asResponse } from '@/common/http/returns';

export const toAssistantView = (row: { id: string; full_name: string }): AssistantView =>
  asResponse(assistantViewSchema, { profile_id: row.id, full_name: row.full_name });

export const toAssistantLesson = (
  view: z.input<typeof assistantLessonViewSchema>,
): AssistantLessonView => asResponse(assistantLessonViewSchema, view);
