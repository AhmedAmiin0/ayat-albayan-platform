import { lessonStatusSchema } from '@ab/catalog';
import { id, instant } from '@ab/core';
import { z } from 'zod';
import { chatListRefSchema } from '../chat-lists/chat-lists.schemas';
import { messageViewSchema } from '../message-view';
import { threadPeopleSchema } from '../thread-people';
import { threadViewSchema } from './thread-view.schemas';

/** An upcoming lesson of the chat's person: its times fill a template's variables (rule 6). */
export const threadLessonSchema = z.object({
  id: id(),
  starts_at: instant,
  meeting_link: z.string().nullable(),
  /** The guardian's own children in it (all students for a teacher). */
  student_names: z.array(z.string()),
  /** The recipient's tz (the guardian's, or the teacher's). */
  tz: z.string(),
  /** scheduled or confirmed, for the reply note; both absent in an old cache. */
  status: lessonStatusSchema.optional(),
  ends_at: instant.optional(),
});
export type ThreadLesson = z.infer<typeof threadLessonSchema>;

/** GET /threads/:phone (docs/12 §4 H2): `thread` is null when the phone has no messages. */
export const threadDetailSchema = z.object({
  thread: threadViewSchema.nullable(),
  /** Oldest → newest; `before` (an instant) pages back. */
  messages: z.array(messageViewSchema),
  has_more: z.boolean(),
  /** First page only: the guardian's or teacher's next open lessons, for the template composer. */
  lessons: z.array(threadLessonSchema),
  /** First page: who the chat is with; an older page sends it empty (read pages[0]). */
  people: threadPeopleSchema,
  /** The lists the chat is in (docs/22 §3): callers with inbox.lists only. */
  lists: z.array(chatListRefSchema).optional(),
});
export type ThreadDetail = z.infer<typeof threadDetailSchema>;

/** What a new inbound row changes: the 24 h window, its reply line, the unread count. */
export const threadDeltaWindowSchema = threadViewSchema.pick({
  last_inbound_at: true,
  session_open: true,
  unread_count: true,
  reply_line: true,
  last_inbound_line: true,
  last_chat_inbound_at: true,
  last_notifications_inbound_at: true,
});
export type ThreadDeltaWindow = z.infer<typeof threadDeltaWindowSchema>;

/** GET /threads/:phone?after=: what changed in an open chat since the client's newest row. */
export const threadDeltaSchema = z.object({
  /** Rows created after `after`, oldest → newest; at most `limit`. */
  messages: z.array(messageViewSchema),
  /** More than `limit` newer rows: merging would leave a gap, so the client re-reads the chat. */
  has_more: z.boolean(),
  /** Outgoing rows whose status may still move, as they are now. */
  pending: z.array(messageViewSchema),
  /** Only when a new inbound row arrived. */
  thread: threadDeltaWindowSchema.optional(),
});
export type ThreadDelta = z.infer<typeof threadDeltaSchema>;
