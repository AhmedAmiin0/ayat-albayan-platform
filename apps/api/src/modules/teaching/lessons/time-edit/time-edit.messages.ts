import type { QueuedMessage } from '../../scheduling/change-set';
import { confirmationMessages, type ConfirmedLesson, type Contact } from '../status/confirmation-messages';

/**
 * The guardian's confirmation of an edited lesson time (R-SCH-11): the same booking_confirmation*
 * template as a booking or reschedule (R-LES-02), one per guardian, for the NEW start. The dedup
 * key carries that start, so a retry queues nothing new while a later edit to another time does
 * (edit_lesson_time frees the old key). An admin action: queued even with auto_messages_enabled off.
 */
export function timeEditMessages(lesson: ConfirmedLesson, contacts: readonly Contact[]): QueuedMessage[] {
  const startMs = Date.parse(lesson.starts_at);
  return confirmationMessages(lesson, contacts).map((m) => ({ ...m, dedup_key: `${m.dedup_key}:${startMs}` }));
}
