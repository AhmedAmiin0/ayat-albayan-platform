import { messageStatusStyle, type ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { rowTime } from '@/inbox/messages/days/day-label';
import { UnreadCount } from './UnreadCount';

const failed = (th: ThreadView): boolean =>
  th.last_direction === 'outbound' && th.last_status === 'failed';

/**
 * Line 2's end: our last send failed (the admin's turn), else the unread count (WhatsApp's green
 * circle), else nothing.
 */
export function TurnBadge({ thread: th }: { thread: ThreadView }): ReactNode {
  if (failed(th)) {
    return (
      <StatusChip {...messageStatusStyle.failed} label={t.enums.messageStatus.failed} size="sm" />
    );
  }
  return th.unread_count > 0 ? <UnreadCount n={th.unread_count} /> : null;
}

/**
 * Line 1's end as WhatsApp's chat list (owner 2026-10-29): the last message's time (the clock today,
 * «أمس», the weekday, else the date), 12sp ink-3, the accent while the chat has unread messages.
 * `now` is the list's one clock (ThreadsList → useToday).
 */
export function ThreadTime({ thread: th, now }: { thread: ThreadView; now: Date }) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const unread = th.unread_count > 0;
  const time = rowTime(th.last_message_at, cycle, { now });
  if (!time) return null;
  return (
    <AppText
      testID="thread-time"
      numberOfLines={1}
      style={{
        flexShrink: 0,
        fontFamily: type.ui[unread ? 600 : 400],
        fontSize: type.size['2xs'],
        lineHeight: type.lineHeight(type.size['2xs']),
        color: unread ? color.lapis : color.ink3,
        fontVariant: ['tabular-nums'],
      }}
    >
      {time}
    </AppText>
  );
}
