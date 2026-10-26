import { Logger } from '@nestjs/common';
import type { NotificationPolicy } from '../../modules/messaging/notification-rules/policy/policy';

// W1–W3 (docs/23a §B2): the booking / reschedule / time-edit confirmations ride inside the write's own
// transaction (create_booking, apply_lesson_changes, edit_lesson_time, change_course). The
// booking_confirmation rule decides whether they are queued: off (or unreadable, fail closed) = the
// write goes through without them (logged), never a failed booking.

const log = new Logger('BookingConfirmation');

/** A booking_confirmation* row (booking_confirmation, _meet, _plain). */
export function isConfirmation(m: unknown): boolean {
  if (typeof m !== 'object' || m === null || !('template_key' in m)) return false;
  return typeof m.template_key === 'string' && m.template_key.startsWith('booking_confirmation');
}

/**
 * The messages to write: unchanged (and no rule read) when none is a confirmation or the rule is on;
 * without the confirmations when it is off. Other rows are never touched.
 */
export async function gateConfirmations<T>(policy: NotificationPolicy, messages: readonly T[]): Promise<T[]> {
  if (!messages.some(isConfirmation)) return [...messages];
  if (await policy.isOn('booking_confirmation')) return [...messages];
  const kept = messages.filter((m) => !isConfirmation(m));
  log.log(`booking_confirmation off: ${messages.length - kept.length} confirmation(s) not queued`);
  return kept;
}
