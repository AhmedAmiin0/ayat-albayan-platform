import { messageStatusStyle, type ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { useClockCycle } from '@/core/lib/clock';
import { t, StatusChip, AppText, type, useTheme } from '@ab/mobile-kit';
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

/** `now` is the list's one clock (useToday). */
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
