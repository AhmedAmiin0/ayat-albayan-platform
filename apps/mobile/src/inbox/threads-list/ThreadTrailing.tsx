import { messageStatusStyle, type ThreadView } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { rowTime } from '@/inbox/messages/days/day-label';
import { UnreadCount } from './UnreadCount';

/** Our last send failed (the admin's turn), else the unread count (WhatsApp's green circle), else nothing. */
function turnChip(th: ThreadView): ReactNode {
  if (th.last_direction === 'outbound' && th.last_status === 'failed') {
    return <StatusChip {...messageStatusStyle.failed} label={t.enums.messageStatus.failed} size="sm" />;
  }
  if (th.unread_count > 0) return <UnreadCount n={th.unread_count} />;
  return null;
}

/**
 * The row's end as WhatsApp's chat list (owner 2026-10-29): the last message's time on top (the clock
 * today, «أمس», the weekday, else the date), green while the chat has unread messages; the count or
 * the failed chip under it. `now` is the list's one clock (ThreadsList → useToday).
 */
export function ThreadTrailing({ thread: th, now }: { thread: ThreadView; now: Date }) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const unread = th.unread_count > 0;
  const time = rowTime(th.last_message_at, cycle, { now });
  return (
    <View style={{ alignItems: 'flex-end', gap: 6 }}>
      {time ? (
        <AppText
          testID="thread-time"
          numberOfLines={1}
          style={{ fontFamily: type.ui[unread ? 600 : 500], fontSize: type.size['2xs'], color: unread ? color.lapis : color.ink3, fontVariant: ['tabular-nums'] }}
        >
          {time}
        </AppText>
      ) : null}
      {turnChip(th)}
    </View>
  );
}
