import type { MessageView } from '@ab/shared';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { clockAt } from '@/inbox/shared/format';
import { MessageMeta, useSmall } from '@/inbox/messages/components/MessageMeta';
import { type, useTheme } from '@/theme';

/**
 * A message hidden from the platform (owner 2026-10-30): a muted placeholder that says it is still
 * on the customer's phone, who hid it and when; never its text or file. The time and ticks stay.
 */
export function HiddenBody({ message: m }: { message: MessageView }) {
  const { color } = useTheme();
  const small = useSmall();
  const cycle = useClockCycle();
  const hidden = m.hidden;
  if (!hidden) return null;
  const time = clockAt(Date.parse(hidden.at), cycle);
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
