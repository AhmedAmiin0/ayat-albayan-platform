import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { DeliveryTicks } from './DeliveryTicks';
import { lineWord } from '../../shared/line-words';
import { clock, deliveryTimes, errorLine, queuedLine } from '../hooks/message-text';
import { senderText } from '../../thread/hooks/thread-mode';
import { useClockCycle } from '@/core/lib/clock';

export function useSmall() {
  const { color } = useTheme();
  return {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
}

/**
 * When (the time only: the day is in the separator above, owner 2026-10-27), the line it came in
 * on or left from (a plain word), and for ours the delivery ticks; a row scheduled later says when it goes; who sent ours («أرسلها: سارة», «رسالة تلقائية»). A long press on the ticks shows their
 * times on a line of their own under this row, so an older message's long times wrap in the bubble.
 * `onTicksPress`: the admin's row that did not go out (a tap on «! لم تُرسل» opens FailedSheet).
 */
export function MessageMeta({ message: m, onTicksPress }: { message: MessageView; onTicksPress?: () => void }) {
  const cycle = useClockCycle();
  const small = useSmall();
  const [open, setOpen] = useState(false);
  const later = queuedLine(m, { cycle });
  const sender = senderText(m);
  const times = m.direction === 'outbound' ? deliveryTimes(m, { cycle }) : '';
  return (
    <>
      {sender ? <AppText style={small}>{sender}</AppText> : null}
      {/* As WhatsApp: at the bubble's inline-end, the ticks right after the time (the web's order). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        {m.line ? <AppText style={small}>{lineWord(m.line)}</AppText> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText style={small}>{clock(m.created_at, cycle)}</AppText>
          {m.direction === 'outbound' ? (
            <DeliveryTicks
              status={m.status}
              times={times}
              onLongPress={() => setOpen((v) => !v)}
              onPress={onTicksPress}
              actionLabel={onTicksPress && m.status === 'failed' ? errorLine(m) : undefined}
            />
          ) : null}
        </View>
      </View>
      {open && times ? (
        <AppText testID="ticks-times" style={{ ...small, alignSelf: 'flex-end', textAlign: 'right' }}>
          {times}
        </AppText>
      ) : null}
      {later ? <AppText style={small}>{later}</AppText> : null}
    </>
  );
}
