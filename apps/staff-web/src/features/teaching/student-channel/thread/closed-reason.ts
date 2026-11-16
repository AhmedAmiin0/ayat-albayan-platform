import type { ChannelClosedReason as ClosedReason } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

const c = t.studentChannel;

/** The closed line for each reason (read at call time: the admins' text overrides apply). */
const CLOSED_TEXT: Readonly<Record<ClosedReason, () => string>> = {
  not_subscribed: () => c.closedReasons.not_subscribed,
  no_teacher: () => c.closedReasons.no_teacher,
  family_chat_off: () => c.closedReasons.family_chat_off,
};

const isReason = (r: string): r is ClosedReason => Object.hasOwn(CLOSED_TEXT, r);

/**
 * The closed line for this page's reason; absent or unknown, «تُفتح المحادثة مع المعلم بعد
 * الاشتراك» as before.
 */
export function closedText(reason: string | null | undefined): string {
  const r = reason ?? '';
  return isReason(r) ? CLOSED_TEXT[r]() : c.closed;
}
