import { z } from 'zod';
import type { MessageStatus } from '../enums/index.js';

/** POST /public/join/:linkToken: the name the student or guardian types (shown to the others). */
export const guestJoinSchema = z.object({
  name: z.string().trim().min(1).max(30),
});
export type GuestJoin = z.output<typeof guestJoinSchema>;

/** POST /students/:id/assistants (admin). The profile must have role = assistant. */
export const assignAssistantSchema = z.object({ profileId: z.uuid() });
export type AssignAssistant = z.output<typeof assignAssistantSchema>;

/** POST /lessons/:id/join-link (admin): the family's one-lesson link, sent by WhatsApp. */
export const joinLinkRequestSchema = z.object({ studentId: z.uuid() });
export type JoinLinkRequest = z.output<typeof joinLinkRequestSchema>;

export interface JoinLinkResult {
  expires_at: string;
  replayed: boolean;
  message_status: MessageStatus;
}

/** A teaching assistant as the admin's manager lists them (GET /assistants, GET /students/:id/assistants). */
export interface AssistantView {
  profile_id: string;
  full_name: string;
}

/** GET /assistants/me/lessons: one of today's sessions of an assistant's students. */
export interface AssistantLessonView {
  lesson_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  teacher_name: string;
  student_names: string[];
}
