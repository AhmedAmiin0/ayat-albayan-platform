import type { MessageView } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
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
 * `onTicksPress`: the admin's row that did not go out (a tap on «! لم تُرسل» or the queued clock opens
 * FailedSheet); the reader hears why it failed, or «أرسلها بنفسك» for a queued one.
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
              actionLabel={onTicksPress ? (m.status === 'failed' ? errorLine(m) : t.messages.clickToChat) : undefined}
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

/**
 * «السبب: …» under a failed send, for everyone (the web's outboundNotes). The admin's is a button to
 * the same sheet as «! لم تُرسل» (a wide target, as WhatsApp's tap on the failed row), cut to two
 * lines since the sheet shows it in full; anyone else reads it whole, its remedy included.
 */
export function FailReason({ message: m, onPress }: { message: MessageView; onPress?: () => void }) {
  const small = useSmall();
  const text = (
    <AppText numberOfLines={onPress ? 2 : undefined} style={{ ...small, fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) }}>
      {errorLine(m)}
    </AppText>
  );
  if (!onPress) return text;
  return (
    <Pressable accessibilityRole="button" hitSlop={{ top: 8, bottom: 8 }} onPress={onPress}>
      {text}
    </Pressable>
  );
}
