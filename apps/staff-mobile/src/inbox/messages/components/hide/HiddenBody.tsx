import type { MessageView } from '@ab/shared';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, AppText, type, useTheme, useSmallText } from '@ab/mobile-kit';
import { clockAt } from '@/inbox/shared/format';
import { MessageMeta } from '@/inbox/messages/components/MessageMeta';

/**
 * A message hidden from the platform: a muted placeholder that says it is still
 * on the customer's phone, who hid it and when; never its text or file. The time and ticks stay.
 */
export function HiddenBody({ message: m }: { message: MessageView }) {
  const { color } = useTheme();
  const small = useSmallText();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const hidden = m.hidden;
  if (!hidden) return null;
  const time = clockAt(Date.parse(hidden.at), cycle, tz);
  const by = hidden.by_name
    ? t.inbox.hide.by.replace('{name}', hidden.by_name).replace('{time}', time)
    : t.inbox.hide.byUnknown.replace('{time}', time);
  return (
    <>
      <AppText
        testID={`hidden-${m.id}`}
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          fontStyle: 'italic',
          color: color.ink3,
        }}
      >
        {t.inbox.hide.placeholder}
      </AppText>
      <AppText style={small}>{by}</AppText>
      <MessageMeta message={m} />
    </>
  );
}
